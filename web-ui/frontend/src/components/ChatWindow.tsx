import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Button, Input, Select, Typography, message} from "antd";
import {PauseCircleOutlined, SendOutlined, ToolOutlined} from "@ant-design/icons";
import type {ChatEvent, Message, RuntimeInfo} from "../api/chat";
import {createChatStream, interruptSession} from "../api/chat";

const {Text} = Typography;
const {TextArea} = Input;

// ---------------------------------------------------------------------------
// Content filter — removes noise from chat display
// ---------------------------------------------------------------------------

const GIT_MERGE_RE = /^(Auto-merging|CONFLICT|warning:|\s{2}\|Merge conflict)/m;

function isGitMergeOutput(content: string): boolean {
  return GIT_MERGE_RE.test(content) && content.split("\n").every(
    (line) =>
      !line.trim() ||
      GIT_MERGE_RE.test(line) ||
      line.startsWith(" ") ||
      /^\d+ file/.test(line) ||
      /^Automatically merged/.test(line),
  );
}

// True when the content looks like TypeScript / JavaScript source code.
// Catches: i18n files, types, interfaces, import/export statements.
function isTsSourceCode(content: string): boolean {
  const lines = content.split("\n");
  if (lines.length < 3) return false;

  // Strong indicators of TS/TSX source: import type, export const/type/interface,
  // "interface " declarations, "type {" patterns, .ts/.tsx file references in comments
  const sourceIndicators = [
    /^import type \{ .+ \} from ['"]\.\//m,        // import type { X } from "./"
    /^export (const|function|type|interface|class) /m, // export const / type / interface
    /: Translations = \{/m,                           // i18n type assignment
    /interface \w+ \{/m,                              // TypeScript interface
    /type \w+ = \{/m,                                 // type X = {
    /^\s*import \{[^}]+\} from ['"][^'"]+['"];?$/m,  // named imports
    /^\s*export default \w+/m,                        // export default
    /^\s*\/\/\s*!.+\.(ts|tsx)\s*$/m,                 // reference path comment
  ];

  const score = sourceIndicators.reduce((acc, re) => acc + (re.test(content) ? 1 : 0), 0);

  // Also check line-level: high density of ": {" and balanced braces
  const braceLines = lines.filter(
    (l) => l.includes(": {") || l.includes("};") || l.includes("},", l.length - 2),
  );
  const braceRatio = braceLines.length / lines.length;

  return score >= 1 || (braceRatio > 0.4 && lines.length > 10);
}

function shouldFilter(content: string): boolean {
  return isGitMergeOutput(content) || isTsSourceCode(content);
}

// ---------------------------------------------------------------------------
// Lightweight Markdown renderer (dark-aware, no extra packages)
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string, dark: boolean): string {
  const codeBg = dark ? "#2d2d2d" : "#f0f0f0";
  const codeColor = dark ? "#e0e0e0" : "#102542";
  // Inline code
  text = text.replace(
    /`([^`]+)`/g,
    (_m, code) =>
      `<code style="background:${codeBg};color:${codeColor};padding:1px 5px;border-radius:4px;font-size:0.88em;font-family:monospace">${escapeHtml(code)}</code>`,
  );
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/_([^_]+)_/g, "<em>$1</em>");
  // Links
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" style="color:#60a5fa">$1</a>',
  );
  return text;
}

function renderCodeBlock(text: string, lang: string | undefined, dark: boolean): string {
  const preBg = dark ? "#0d1117" : "#1e1e1e";
  const textColor = dark ? "#e6e6e6" : "#d4d4d4";
  const mutedColor = dark ? "#8b949e" : "#6b7280";
  const borderColor = dark ? "#30363d" : "#333";
  const langLabel = lang
    ? `<span style="color:${mutedColor};font-size:11px;float:right">${escapeHtml(lang)}</span>`
    : "";
  return (
    `<pre style="background:${preBg};color:${textColor};padding:12px 14px;` +
    `border-radius:8px;overflow-x:auto;margin:6px 0;font-size:13px;line-height:1.5;` +
    `position:relative;border:1px solid ${borderColor}">` +
    `${langLabel}${escapeHtml(text)}</pre>`
  );
}

function renderMarkdown(raw: string, dark = false): string {
  const lines = raw.split("\n");
  const output: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  while (i < lines.length) {
    const line = lines[i];

    // Code block fences
    if (line.trimStart().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
        codeLang = line.trimStart().slice(3).trim();
      } else {
        output.push(renderCodeBlock(codeLines.join("\n"), codeLang, dark));
        inCodeBlock = false;
        codeLines = [];
        codeLang = "";
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // Headers
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      output.push(
        `<h${level} style="margin:8px 0 4px;font-size:${1.4 - level * 0.1}em;font-weight:600">` +
        `${renderInline(hMatch[2], dark)}</h${level}>`,
      );
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)/);
    if (ulMatch) {
      const indent = ulMatch[1].length;
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^(\s*)[-*]\s+(.*)/)) {
        items.push(
          `<li style="margin:2px 0">${renderInline(
            lines[i].replace(/^(\s*)[-*]\s+/, ""),
            dark,
          )}</li>`,
        );
        i++;
      }
      if (items.length) {
        output.push(
          `<ul style="margin:4px 0 4px ${indent * 8}px;padding-left:16px">${items.join("")}</ul>`,
        );
      }
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      const indent = olMatch[1].length;
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^(\s*)\d+\.\s+(.*)/)) {
        items.push(
          `<li style="margin:2px 0">${renderInline(
            lines[i].replace(/^\s*\d+\.\s+/, ""),
            dark,
          )}</li>`,
        );
        i++;
      }
      if (items.length) {
        output.push(
          `<ol style="margin:4px 0 4px ${indent * 8}px;padding-left:20px">${items.join("")}</ol>`,
        );
      }
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s?(.*)/);
    if (quoteMatch) {
      const qColor = dark ? "#8b949e" : "#6b7280";
      output.push(
        `<blockquote style="border-left:3px solid #1d4ed8;margin:4px 0;padding:2px 12px;color:${qColor};font-style:italic">` +
        `${renderInline(quoteMatch[1], dark)}</blockquote>`,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}\s*$/)) {
      const hrColor = dark ? "#30363d" : "#e2e8f0";
      output.push(`<hr style="border:none;border-top:1px solid ${hrColor};margin:8px 0"/>`);
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      output.push("");
      i++;
      continue;
    }

    // Regular paragraph
    output.push(`<p style="margin:4px 0">${renderInline(line, dark)}</p>`);
    i++;
  }

  return output.join("\n");
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

interface BubbleProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  dark: boolean;
}

function MessageBubble({role, content, dark}: BubbleProps) {
  const userBubble = dark ? "#1d4ed8" : "#1c3f6e";
  const assistantBubble = dark ? "#161b22" : "#edf2f7";
  const userText = "#ffffff";
  const assistantText = dark ? "#e6e6e6" : "#102542";
  const border = dark ? "#30363d" : "#e2e8f0";

  const isUser = role === "user";
  const bg = isUser ? userBubble : assistantBubble;
  const color = isUser ? userText : assistantText;

  if (isUser) {
    return (
      <div style={{display: "flex", justifyContent: "flex-end"}}>
        <div
          style={{
            maxWidth: "78%",
            background: bg,
            color,
            borderRadius: 14,
            padding: "10px 14px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{display: "flex", justifyContent: "flex-start"}}>
      <div
        style={{
          maxWidth: "82%",
          background: bg,
          color,
          borderRadius: 14,
          padding: "10px 14px",
          border: `1px solid ${border}`,
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{__html: renderMarkdown(content, dark)}}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool / status event row
// ---------------------------------------------------------------------------

function EventRow({event, dark}: {event: ChatEvent; dark: boolean}) {
  const border = dark ? "#30363d" : "#e2e8f0";
  const muted = dark ? "#8b949e" : "#6b7280";
  const toolBg = dark ? "#161b22" : "#f8fafc";
  const toolText = dark ? "#8b949e" : "#64748b";

  if (event.type === "tool") {
    const iconTxt = event.is_error ? "[x]" : "[*]";
    const color = event.is_error ? "#ef4444" : "#22c55e";
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          background: toolBg,
          border: `1px solid ${border}`,
          borderRadius: 8,
          margin: "2px 0",
        }}
      >
        <ToolOutlined style={{color: muted, fontSize: 12}} />
        <span style={{color, fontSize: 12, fontWeight: 500}}>{iconTxt}</span>
        <span style={{color: toolText, fontSize: 12, fontFamily: "monospace"}}>
          {event.tool_name}
        </span>
        {event.preview && (
          <span
            style={{
              color: muted,
              fontSize: 11,
              marginLeft: "auto",
              maxWidth: 260,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {event.preview}
          </span>
        )}
        {event.duration != null && (
          <span style={{color: muted, fontSize: 11, marginLeft: 8}}>{event.duration}ms</span>
        )}
      </div>
    );
  }

  if (event.type === "status") {
    return (
      <div style={{padding: "2px 8px", color: muted, fontSize: 12, fontStyle: "italic"}}>
        {event.content}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// ChatWindow
// ---------------------------------------------------------------------------

interface ChatWindowProps {
  sessionId: string | null;
  messages: Message[];
  runtime: RuntimeInfo | null;
  dark: boolean;
  onSessionCommitted: (sessionId: string, messages: Message[]) => Promise<void>;
  onSessionRenamed: (sessionId: string, title: string) => Promise<void>;
}

export default function ChatWindow({
  sessionId,
  messages,
  runtime,
  dark,
  onSessionCommitted,
  onSessionRenamed,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const [liveEvents, setLiveEvents] = useState<ChatEvent[]>([]);
  const abortRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const modelOptions = useMemo(() => {
    if (!runtime?.available_models?.length) return [];
    return runtime.available_models.map((entry) => ({
      value: JSON.stringify(entry),
      label: entry.provider ? `${entry.provider}: ${entry.model}` : entry.model,
    }));
  }, [runtime]);

  const [selectedModel, setSelectedModel] = useState<string>("");

  useEffect(() => {
    if (runtime?.available_models?.length && !selectedModel) {
      setSelectedModel(JSON.stringify(runtime.available_models[0]));
    }
  }, [runtime, selectedModel]);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: "smooth"});
  }, [localMessages, streamingContent, liveEvents]);

  const effectiveModel = selectedModel ? JSON.parse(selectedModel) : null;

  const visibleMessages = useMemo(() => {
    if (!streamingContent) return localMessages;
    if (shouldFilter(streamingContent)) return localMessages;
    return [...localMessages, {role: "assistant" as const, content: streamingContent}];
  }, [localMessages, streamingContent]);

  const handleEvent = useCallback(
    (event: ChatEvent) => {
      if (event.type === "chunk") {
        setStreamingContent((prev) => prev + event.content);
      } else if (event.type === "done") {
        setStreaming(false);
        setStreamingContent("");
        setLiveEvents([]);
        abortRef.current = null;
        const filtered = event.messages.filter(
          (m) => !(m.role === "assistant" && shouldFilter(m.content)),
        );
        void onSessionCommitted(event.session_id, filtered);
      } else if (event.type === "error") {
        setStreaming(false);
        setStreamingContent("");
        setLiveEvents([]);
        abortRef.current = null;
        message.error(event.content);
      } else {
        setLiveEvents((prev) => [...prev.slice(-50), event]);
      }
    },
    [onSessionCommitted],
  );

  function handleSend() {
    const content = draft.trim();
    if (!content || streaming) return;

    setLocalMessages((prev) => [...prev, {role: "user", content}]);
    setDraft("");
    setStreaming(true);
    setStreamingContent("");
    setLiveEvents([]);

    abortRef.current = createChatStream(
      content,
      sessionId,
      effectiveModel?.model || null,
      effectiveModel?.provider || null,
      effectiveModel?.base_url || null,
      {
        onEvent: handleEvent,
        onError: (err) => {
          setStreaming(false);
          setStreamingContent("");
          message.error(err);
        },
      },
    );
  }

  async function handleStop() {
    if (sessionId) {
      await interruptSession(sessionId).catch(() => undefined);
    }
    abortRef.current?.();
    abortRef.current = null;
    setStreaming(false);
    setStreamingContent("");
    setLiveEvents([]);
  }

  async function handleRename() {
    if (!sessionId || !titleDraft.trim()) return;
    await onSessionRenamed(sessionId, titleDraft.trim());
    setTitleDraft("");
  }

  const bg = dark ? "#0d1117" : "#f4f7fb";
  const surface = dark ? "#161b22" : "#ffffff";
  const border = dark ? "#30363d" : "#e2e8f0";
  const muted = dark ? "#8b949e" : "#64748b";

  return (
    <div style={{height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", padding: 0}}>

      {/* Control bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
          background: surface,
        }}
      >
        <Text style={{color: muted, fontSize: 12, whiteSpace: "nowrap"}}>
          {sessionId ? `Session: ${sessionId.slice(0, 8)}` : "New Session"}
        </Text>

        <Input
          placeholder="Title"
          value={titleDraft}
          onChange={(evt) => setTitleDraft(evt.target.value)}
          disabled={!sessionId}
          style={{flex: "0 0 140px", fontSize: 12}}
          size="small"
        />
        <Button size="small" onClick={() => void handleRename()} disabled={!sessionId || !titleDraft.trim()}>
          Rename
        </Button>

        {modelOptions.length > 0 && (
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            options={modelOptions}
            style={{flex: "0 0 220px", fontSize: 12}}
            size="small"
          />
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: bg,
        }}
      >
        {!visibleMessages.length && !streaming ? (
          <div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <Text type="secondary">Start a conversation</Text>
          </div>
        ) : (
          <>
            {visibleMessages.map((msg, index) => (
              <MessageBubble
                key={`${msg.role}-${index}`}
                role={msg.role}
                content={msg.content}
                dark={dark}
              />
            ))}

            {liveEvents.map((ev, idx) => (
              <EventRow key={`live-${idx}`} event={ev} dark={dark} />
            ))}

            {streaming && streamingContent && (
              <MessageBubble role="assistant" content={streamingContent} dark={dark} />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${border}`,
          background: surface,
          flexShrink: 0,
        }}
      >
        <div style={{display: "flex", gap: 8, alignItems: "flex-end"}}>
          <TextArea
            value={draft}
            onChange={(evt) => setDraft(evt.target.value)}
            autoSize={{minRows: 2, maxRows: 8}}
            placeholder="Enter a prompt -- Shift+Enter for newline"
            onPressEnter={(evt) => {
              if (!evt.shiftKey) {
                evt.preventDefault();
                handleSend();
              }
            }}
            style={{flex: 1, borderRadius: 10}}
          />
          {streaming ? (
            <Button danger icon={<PauseCircleOutlined />} onClick={() => void handleStop()}>
              Stop
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!draft.trim()}
            >
              Send
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
