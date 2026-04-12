# Hermes Agent Web UI — Specification

## Overview

A web-based interface for Hermes Agent combining real-time chat and administration dashboard. Built with React (frontend) + FastAPI (backend), designed for Windows-native deployment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │ Chat Panel   │  │ Dashboard    │  │ Settings     │    │
│   └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────┬──────────────────────────────────┘
                         │ WebSocket + REST
┌────────────────────────┴──────────────────────────────────┐
│                     FastAPI Backend                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │ Chat API     │  │ Session API  │  │ Config API   │    │
│   └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────┬──────────────────────────────────┘
                         │ Hermes CLI / Gateway
┌────────────────────────┴──────────────────────────────────┐
│                  Hermes Agent Core                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │ CLI Mode     │  │ Gateway API  │  │ Tool Access  │    │
│   └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 18 + TypeScript | Type safety, component ecosystem |
| UI Library | shadcn/ui + Tailwind CSS | Modern, accessible components |
| State | Zustand | Lightweight, simple API |
| Backend | FastAPI | Async, Python, native Hermes integration |
| WebSocket | FastAPI WebSocket | Real-time chat streaming |
| Auth | JWT tokens | Stateless, secure |

---

## Directory Structure

```
hermes-agent/
├── web_ui/                    # Web UI project root
│   ├── frontend/              # React application
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   │   ├── chat/     # Chat-specific components
│   │   │   │   ├── dashboard/ # Admin dashboard components
│   │   │   │   └── ui/       # Shared UI components
│   │   │   ├── pages/        # Route pages
│   │   │   ├── stores/       # Zustand state stores
│   │   │   ├── api/          # API client functions
│   │   │   └── lib/          # Utilities
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── backend/              # FastAPI application
│   │   ├── main.py           # FastAPI app entry
│   │   ├── routers/          # API route modules
│   │   │   ├── chat.py       # Chat endpoints
│   │   │   ├── sessions.py   # Session management
│   │   │   ├── skills.py     # Skills management
│   │   │   ├── memory.py     # Memory/knowledge
│   │   │   └── config.py     # Configuration
│   │   ├── services/         # Business logic
│   │   └── models/           # Pydantic models
│   ├── Dockerfile
│   └── docker-compose.yml
├── website/                   # Existing docs site (keep)
└── ...
```

---

## Feature Specification

### 1. Chat Interface

#### Core Features
- **Real-time messaging** via WebSocket streaming
- **Markdown rendering** with code syntax highlighting
- **Tool call display** — show when agent uses tools
- **Streaming responses** — typewriter effect for agent replies
- **Session history** — persistent chat threads
- **"/" command shortcuts** — type "/" in input to show command palette with all slash commands (auto-complete, navigation)
- **Model selector** — top bar displays current model, click to switch from available models list

#### UI Layout
```
┌────────────────────────────────────────────────────────────┐
│  Hermes        [Model: claude-3.5-sonnet ▾] [Sessions▾] [⚙] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Welcome to Hermes Agent          [New Chat]         │   │
│  │ Ask me anything...                                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Type "/" for commands...                       [Send]│   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

#### "/" Command Palette
When user types "/" in the input box, show a floating palette with:
- All available slash commands (filtered as user types)
- Command description
- Keyboard navigation (↑↓ to select, Enter to execute, Esc to close)
- Commands: /new, /model, /skills, /memory, /compress, /help, etc.

#### API Endpoints
```
POST   /api/chat/message          # Send message (REST)
WS     /api/chat/stream/{session} # WebSocket stream
GET    /api/chat/history/{session}# Get chat history
DELETE /api/chat/history/{session}# Clear session
```

### 2. Management Dashboard

#### Sessions Panel
- List all active/archived sessions
- Search sessions by content
- View session metadata (created, last active, model used)
- Delete/archive sessions

#### Skills Panel
- Browse installed skills
- Enable/disable skills
- View skill README/usage
- Skill configuration

#### Memory Panel
- View agent memories (SOUL.md, MEMORY.md, USER.md)
- Edit memories inline
- Memory statistics

#### Cron Jobs Panel
- List scheduled tasks
- View job history/logs
- Pause/resume jobs

#### Configuration Panel
- Model selection
- Provider configuration
- Tool toggle per toolset
- Display preferences

### 3. Authentication

- **Login page** with username/password
- **JWT tokens** stored in httpOnly cookies
- **Role-based access** (admin vs user)
- **Session management** in settings

---

## Data Models

### Chat Message
```typescript
interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  created_at: string;
}
```

### Session
```typescript
interface Session {
  id: string;
  name: string;
  model: string;
  created_at: string;
  last_active_at: string;
  message_count: number;
  is_archived: boolean;
}
```

### Skill
```typescript
interface Skill {
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  version: string;
}
```

---

## Backend API Design

### Authentication
```
POST /api/auth/login     # Login, returns JWT
POST /api/auth/logout   # Clear session
GET  /api/auth/me       # Current user info
```

### Chat
```
POST /api/chat/message
Body: { session_id?: string, content: string }
Response: { message_id, session_id, streaming_url }

WS /api/chat/stream/{session_id}
  → Server sends: { type: 'chunk'|'tool_call'|'done', data: ... }

GET /api/chat/history/{session_id}?limit=50&before=<cursor>
Response: { messages: ChatMessage[], next_cursor: string | null }

DELETE /api/chat/history/{session_id}
Response: { success: true }
```

### Sessions
```
GET    /api/sessions          # List all sessions
GET    /api/sessions/{id}    # Get session details
DELETE /api/sessions/{id}    # Delete session
POST   /api/sessions/{id}/archive   # Archive session
```

### Skills
```
GET    /api/skills            # List all skills
PATCH  /api/skills/{name}    # Update skill (enable/disable/config)
GET    /api/skills/{name}/readme   # Get skill README
```

### Memory
```
GET    /api/memory            # Get all memory files
GET    /api/memory/{type}     # Get specific memory (soul|memory|user)
PATCH  /api/memory/{type}     # Update memory content
```

### Cron
```
GET    /api/cron/jobs         # List scheduled jobs
GET    /api/cron/jobs/{id}/history  # Job execution history
POST   /api/cron/jobs/{id}/pause     # Pause job
POST   /api/cron/jobs/{id}/resume    # Resume job
```

### Config
```
GET    /api/config            # Get current config
PATCH  /api/config            # Update config
GET    /api/config/models     # List available models
```

---

## Deployment

### Windows (Development)
```powershell
# Start backend
cd web_ui/backend
python -m uvicorn main:app --reload --port 8000

# Start frontend (separate terminal)
cd web_ui/frontend
npm run dev
```

### Docker (Production)
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - HERMES_HOME=C:/Users/{user}/.hermes
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Project scaffolding (FastAPI + React)
- [ ] Basic authentication (login/logout)
- [ ] Chat interface (send message, receive response)
- [ ] Session management (create, list, switch)

### Phase 2: Enhanced Chat
- [ ] WebSocket streaming
- [ ] Tool call display
- [ ] Markdown/code rendering
- [ ] Chat history persistence

### Phase 3: Dashboard
- [ ] Skills management panel
- [ ] Memory viewer/editor
- [ ] Configuration panel
- [ ] Cron jobs overview

### Phase 4: Polish
- [ ] Responsive design
- [ ] Dark/light theme
- [ ] Keyboard shortcuts
- [ ] Notifications

---

## Open Questions / TODOs

1. **Hermes Gateway Integration**: How does the web backend communicate with Hermes CLI? Direct subprocess spawn or HTTP API?
2. **Windows Path Handling**: Ensure all file paths work with Windows conventions
3. **Session Persistence**: Use existing Hermes session DB or create separate web-ui session store?
4. **Multi-user**: Support multiple simultaneous web users? Or single-user local use?
5. **TLS/HTTPS**: Required for production deployment?
6. **Real-time Tool Progress**: How to stream tool execution progress to frontend?

---

## Design Inspiration

- **Chat**: Linear, Claude Web, Cursor
- **Dashboard**: Vercel Dashboard, Railway, Railway Dashboard
- **Theme**: Dark mode default, shadcn/ui components
