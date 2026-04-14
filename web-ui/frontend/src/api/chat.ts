const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

export type SessionSummary = {
  id: string;
  title: string;
  preview: string;
  message_count: number;
  source: string;
  model: string;
  last_active: number;
};

export type RuntimeInfo = {
  model: string;
  provider: string | null;
  base_url: string | null;
  max_turns: number;
  enabled_toolsets: string[];
  available_models: Array<{
    model: string;
    provider: string | null;
    base_url: string | null;
  }>;
};

export type ChatEvent =
  | {type: "session"; session_id: string; model: string; enabled_toolsets: string[]}
  | {type: "chunk"; content: string}
  | {type: "status"; kind: string; content: string}
  | {type: "tool"; event: string; tool_name: string; preview?: string | null; duration?: number; is_error?: boolean}
  | {type: "done"; content: string; session_id: string; messages: Message[]}
  | {type: "error"; content: string; session_id?: string};

export type StreamHandlers = {
  onEvent: (event: ChatEvent) => void;
  onError: (error: string) => void;
};

function parseSseChunk(buffer: string, onEvent: (event: ChatEvent) => void): string {
  let remaining = buffer;
  while (true) {
    const boundary = remaining.indexOf("\n\n");
    if (boundary === -1) {
      return remaining;
    }
    const rawEvent = remaining.slice(0, boundary);
    remaining = remaining.slice(boundary + 2);

    const dataLines = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6));

    if (!dataLines.length) {
      continue;
    }

    try {
      onEvent(JSON.parse(dataLines.join("\n")) as ChatEvent);
    } catch {
      // Ignore malformed partial payloads and keep the stream alive.
    }
  }
}

export function createChatStream(
  message: string,
  sessionId: string | null,
  model: string | null,
  provider: string | null,
  baseUrl: string | null,
  handlers: StreamHandlers
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({message, session_id: sessionId, model, provider, base_url: baseUrl}),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";

      const pump = (): void => {
        reader.read().then(({done, value}) => {
          if (done) {
            return;
          }
          buffered += decoder.decode(value, {stream: true});
          buffered = parseSseChunk(buffered, handlers.onEvent);
          pump();
        }).catch((err: Error) => {
          if (err.name !== "AbortError") {
            handlers.onError(err.message);
          }
        });
      };

      pump();
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") {
        handlers.onError(err.message);
      }
    });

  return () => controller.abort();
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  const res = await fetch(`${API_BASE}/runtime`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.json() as RuntimeInfo;
}

export async function getSession(sessionId: string): Promise<{session: SessionSummary; messages: Message[]}> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.json() as {session: SessionSummary; messages: Message[]};
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {method: "DELETE"});
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function interruptSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/interrupt`, {method: "POST"});
  if (!res.ok && res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({title}),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.detail || `HTTP ${res.status}`);
  }
}

export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json() as {sessions: SessionSummary[]};
  return data.sessions;
}
