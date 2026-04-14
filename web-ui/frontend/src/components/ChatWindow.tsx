import {useEffect, useMemo, useRef, useState} from "react";
import {Button, Input, Select, Typography, message} from "antd";
import {PauseCircleOutlined, SendOutlined} from "@ant-design/icons";
import type {ChatEvent, Message, RuntimeInfo} from "../api/chat";
import {createChatStream, interruptSession} from "../api/chat";

const {Text} = Typography;
const {TextArea} = Input;

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
  }, [localMessages, streamingContent]);

  const effectiveModel = selectedModel ? JSON.parse(selectedModel) : null;

  const visibleMessages = useMemo(() => {
    if (!streamingContent) return localMessages;
    return [...localMessages, {role: "assistant", content: streamingContent} satisfies Message];
  }, [localMessages, streamingContent]);

  function handleEvent(event: ChatEvent) {
    if (event.type === "chunk") {
      setStreamingContent((prev) => prev + event.content);
      return;
    }
    if (event.type === "done") {
      setStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      void onSessionCommitted(event.session_id, event.messages);
      return;
    }
    if (event.type === "error") {
      setStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      message.error(event.content);
    }
  }

  function handleSend() {
    const content = draft.trim();
    if (!content || streaming) return;

    setLocalMessages((prev) => [...prev, {role: "user", content}]);
    setDraft("");
    setStreaming(true);
    setStreamingContent("");

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
  }

  async function handleRename() {
    if (!sessionId || !titleDraft.trim()) return;
    await onSessionRenamed(sessionId, titleDraft.trim());
    setTitleDraft("");
  }

  const bg = dark ? "#0d1117" : "#f4f7fb";
  const surface = dark ? "#161b22" : "#ffffff";
  const userBubble = dark ? "#1d4ed8" : "#1c3f6e";
  const assistantBubble = dark ? "#21262d" : "#edf2f7";
  const userText = "#ffffff";
  const assistantText = dark ? "#e6e6e6" : "#102542";
  const border = dark ? "#30363d" : "#e2e8f0";
  const muted = dark ? "#8b949e" : "#64748b";

  // height: 100vh minus the 52px app header
  // The outer flex column: [header] [messages flex:1] [input]
  return (
    <div style={{height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", padding: 0}}>

      {/* Session control bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
        background: surface,
      }}>
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

      {/* Messages area — flex: 1 fills remaining space */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: bg,
      }}>
        {!visibleMessages.length ? (
          <div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <Text type="secondary">Start a conversation</Text>
          </div>
        ) : (
          visibleMessages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              style={{display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start"}}
            >
              <div
                style={{
                  maxWidth: "78%",
                  background: msg.role === "user" ? userBubble : assistantBubble,
                  color: msg.role === "user" ? userText : assistantText,
                  borderRadius: 14,
                  padding: "10px 14px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  border: `1px solid ${msg.role === "user" ? "transparent" : border}`,
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — always at bottom */}
      <div style={{
        padding: "10px 14px",
        borderTop: `1px solid ${border}`,
        background: surface,
        flexShrink: 0,
      }}>
        <div style={{display: "flex", gap: 8, alignItems: "flex-end"}}>
          <TextArea
            value={draft}
            onChange={(evt) => setDraft(evt.target.value)}
            autoSize={{minRows: 2, maxRows: 8}}
            placeholder="Enter a prompt — Shift+Enter for newline"
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
