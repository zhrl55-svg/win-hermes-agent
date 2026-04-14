import {useCallback, useEffect, useState} from "react";
import {Button, ConfigProvider, Drawer, Empty, Layout, List, Spin, Tag, Typography, theme} from "antd";
import {HistoryOutlined, MoonOutlined, PlusOutlined, SunOutlined} from "@ant-design/icons";

import ChatWindow from "./components/ChatWindow";
import type {Message, RuntimeInfo, SessionSummary} from "./api/chat";
import {deleteSession, getRuntimeInfo, getSession, listSessions, renameSession} from "./api/chat";

const {Header, Content} = Layout;
const {Text} = Typography;

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleString();
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [dark, setDark] = useState(false);

  const refreshSessions = useCallback(async () => {
    const data = await listSessions();
    setSessions(data);
    setSessionId((current) => current ?? data[0]?.id ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [runtimeInfo, sessionList] = await Promise.all([getRuntimeInfo(), listSessions()]);
        if (cancelled) return;
        setRuntime(runtimeInfo);
        setSessions(sessionList);
        setSessionId((current) => current ?? sessionList[0]?.id ?? null);
      } catch {
        // Keep shell renderable when backend is not up yet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((data) => setMessages(data.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoadingSession(false));
  }, [sessionId, messages]);

  const handleNewSession = useCallback(() => {
    setLoadingSession(false);
    setSessionId(null);
    setMessages([]);
    setDrawerOpen(false);
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setLoadingSession(true);
    setSessionId(id);
    setDrawerOpen(false);
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (sessionId === id) {
      setLoadingSession(Boolean(next[0]?.id));
      setSessionId(next[0]?.id ?? null);
      setMessages(next[0] ? messages : []);
    }
  }, [messages, sessionId, sessions]);

  const handleSessionCommitted = useCallback(async (nextSessionId: string, nextMessages: Message[]) => {
    // Use event.messages directly instead of getSession to avoid a race where
    // getSession() returns stale data while streamingContent is still visible,
    // causing the same reply to appear twice.
    setLoadingSession(false);
    setSessionId(nextSessionId);
    setMessages(nextMessages);
    await refreshSessions();
  }, [refreshSessions]);

  const handleSessionRenamed = useCallback(async (id: string, title: string) => {
    await renameSession(id, title);
    await refreshSessions();
  }, [refreshSessions]);

  const algorithm = dark ? theme.darkAlgorithm : theme.defaultAlgorithm;
  const headerBg = dark ? "#0d1117" : "linear-gradient(90deg, #102542 0%, #1c3f6e 100%)";
  const headerBorder = dark ? "#30363d" : "transparent";

  return (
    <ConfigProvider theme={{algorithm, token: {borderRadius: 8}}}>
      <Layout style={{minHeight: "100vh", background: dark ? "#0d1117" : "#f4f7fb"}}>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 20,
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            height: 52,
            lineHeight: "52px",
          }}
        >
          <div style={{display: "flex", alignItems: "center", gap: 12}}>
            <Text strong style={{color: "#fff", fontSize: 16, letterSpacing: "0.3px"}}>
              Hermes
            </Text>
            {runtime?.model && (
              <Tag color={dark ? "blue" : "geekblue"} style={{margin: 0, lineHeight: "20px"}}>
                {runtime.model}
              </Tag>
            )}
          </div>

          <div style={{display: "flex", gap: 8}}>
            <Button
              type="text"
              icon={dark ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => setDark((d) => !d)}
              style={{color: "#fff"}}
            />
            <Button icon={<HistoryOutlined />} onClick={() => setDrawerOpen(true)} style={{color: "#fff"}}>
              Sessions
            </Button>
            <Button icon={<PlusOutlined />} type="primary" onClick={handleNewSession}>
              New
            </Button>
          </div>
        </Header>

        <Content style={{padding: 0, display: "flex", flexDirection: "column", flex: 1}}>
          {loadingSession ? (
            <div style={{display: "flex", justifyContent: "center", marginTop: 80}}>
              <Spin size="large" />
            </div>
          ) : (
            <ChatWindow
              sessionId={sessionId}
              messages={messages}
              runtime={runtime}
              dark={dark}
              onSessionCommitted={handleSessionCommitted}
              onSessionRenamed={handleSessionRenamed}
            />
          )}
        </Content>

        <Drawer
          title={<Text style={{fontSize: 14}}>Sessions</Text>}
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={340}
          styles={{body: {padding: "12px 16px"}}}
        >
          <Button
            block
            icon={<PlusOutlined />}
            type="primary"
            onClick={handleNewSession}
            style={{marginBottom: 12}}
          >
            New Session
          </Button>

          {sessions.length ? (
            <List
              dataSource={sessions}
              renderItem={(session) => (
                <List.Item
                  key={session.id}
                  style={{
                    cursor: "pointer",
                    borderRadius: 10,
                    background: dark ? "#161b22" : session.id === sessionId ? "#e6f4ff" : "#fff",
                    marginBottom: 6,
                    padding: "10px 12px",
                    border: `1px solid ${dark ? "#30363d" : session.id === sessionId ? "#91caff" : "#f0f0f0"}`,
                  }}
                  onClick={() => handleSelectSession(session.id)}
                  extra={
                    <Button
                      danger
                      size="small"
                      type="text"
                      onClick={(evt) => {
                        evt.stopPropagation();
                        void handleDeleteSession(session.id);
                      }}
                    >
                      ×
                    </Button>
                  }
                >
                  <List.Item.Meta
                    title={<Text style={{fontSize: 13}}>{session.title || session.id}</Text>}
                    description={
                      <Text type="secondary" style={{fontSize: 11}}>
                        {session.message_count} msgs · {formatTimestamp(session.last_active)}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description={<Text type="secondary">No sessions yet</Text>} />
          )}
        </Drawer>
      </Layout>
    </ConfigProvider>
  );
}
