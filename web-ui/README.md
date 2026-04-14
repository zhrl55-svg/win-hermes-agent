# Hermes Web UI

`web-ui` 是 Hermes CLI 的本地 Web 端入口，不是另一套独立 agent。

当前实现目标：
- Web 端和 CLI 共用同一份 `HERMES_HOME`
- Web 端和 CLI 共用同一套会话存储
- Web 端和 CLI 共用同一套工具解析与调用路径
- Web 端通过 FastAPI + SSE 暴露 Hermes 核心运行时能力

## 当前状态

已完成：
- 共享 `~/.hermes/config.yaml`
- 共享 `~/.hermes/.env`
- 共享 `~/.hermes/state.db`
- 共享 CLI toolset 解析结果
- Web 会话列表、加载、重命名、删除
- SSE 流式输出
- 运行时活动面板
- 每轮覆盖 `model / provider / base_url`
- 浏览器实测验证前后端联通

未完成：
- Web 端还不是 CLI 所有命令的一比一图形映射
- 前端体验仍偏工程化，模型切换和工具可视化还可以继续做
- `antd` 产物包仍然偏大

## 架构

```text
Browser
  -> React / Vite frontend
  -> FastAPI backend
  -> HermesWebService
  -> AIAgent.run_conversation()
  -> SessionDB + shared Hermes config
  -> Hermes tools
```

关键点：
- 后端不再维护一套独立的内存会话
- 会话历史来自 Hermes 现有 `SessionDB`
- 模型、provider、base URL、toolsets 来自 Hermes 现有配置
- Web 端发起的对话会写入与 CLI 相同的会话库

## 共享机制

### 1. 共享配置文件

默认读取 Hermes 主配置：
- `C:\Users\<user>\.hermes\config.yaml`
- `C:\Users\<user>\.hermes\.env`

后端入口会调用 Hermes 自己的配置加载逻辑，而不是 `web-ui` 自己维护一份配置副本。

相关代码：
- [backend/hermes_agent.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/hermes_agent.py)

### 2. 共享会话

Web 端会话直接使用 Hermes 的 `SessionDB`。

这意味着：
- CLI 里已有的会话，Web 端可以读取
- Web 端新产生的会话，CLI 也能继续接着用
- 会话标题、消息历史、删除操作都落到同一个数据库

### 3. 共享工具调用

Web 端不会自己维护工具白名单，而是通过 Hermes 现有配置解析 CLI 平台 toolsets。

当前运行时会返回类似：
- `browser`
- `file`
- `terminal`
- `web`
- `memory`
- `skills`
- `todo`

具体以当前 `config.yaml` 为准。

## 目录

```text
web-ui/
├── backend/
│   ├── hermes_agent.py
│   ├── main.py
│   ├── requirements.txt
│   └── test_backend.py
├── frontend/
│   ├── src/
│   │   ├── api/chat.ts
│   │   ├── components/ChatWindow.tsx
│   │   └── App.tsx
│   ├── index.html
│   └── vite.config.ts
└── README.md
```

## 启动方式

### 后端

在仓库根目录下：

```powershell
cd web-ui\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

默认会使用当前机器的 `HERMES_HOME`。

如果要显式指定：

```powershell
$env:HERMES_HOME="$env:USERPROFILE\.hermes"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 前端

```powershell
cd web-ui\frontend
npm install
npm run dev
```

默认前端 API 地址是同源 `/api`。

如果前后端分开跑，可以指定：

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## 主要接口

后端入口：
- [backend/main.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/main.py)

主要接口：
- `GET /`
- `GET /health`
- `GET /runtime`
- `POST /chat/stream`
- `WS /ws/chat/{session_id}`
- `GET /sessions`
- `GET /sessions/{session_id}`
- `PATCH /sessions/{session_id}`
- `POST /sessions/{session_id}/interrupt`
- `DELETE /sessions/{session_id}`

## 前端能力

当前前端已实现：
- 会话列表
- 新建会话
- 历史会话加载
- 会话删除
- 会话标题修改
- SSE 流式响应展示
- 运行时活动面板
- 模型覆盖输入
- provider / base URL 覆盖输入
- 从共享配置生成的模型快捷按钮
- 中断当前运行

关键文件：
- [frontend/src/App.tsx](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/App.tsx)
- [frontend/src/components/ChatWindow.tsx](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/components/ChatWindow.tsx)
- [frontend/src/api/chat.ts](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/api/chat.ts)

## 已完成验证

已验证：
- 后端接口测试通过
- 前端 `lint` 通过
- 前端 `build` 通过
- 浏览器端能加载共享运行时信息
- 浏览器端能提交消息
- 浏览器端能显示运行时活动
- 浏览器端能触发中断按钮

说明：
- 如果真实模型响应较慢，页面会先进入活动状态，再等待模型返回
- 这属于模型延迟，不是 Web UI 与 CLI 共享机制失效

## 已知限制

1. Web 端目前更偏向“共享 Hermes 运行时的会话控制台”，还不是 CLI 全命令中心。
2. 如果前端 dev server 端口变化，后端需要允许对应本地来源；当前已经支持常见本地开发端口和本地地址模式。
3. `antd` 相关 chunk 仍然较大，后续还可以进一步分包或替换部分组件。
4. 真实响应是否成功，仍取决于 Hermes 主配置里的模型和凭据是否可用。

## 测试命令

### 后端

```powershell
python -m pytest web-ui\backend\test_backend.py -q
```

### 前端

```powershell
cd web-ui\frontend
npm run lint
npm run build
```

## 相关文件

- [web-ui/backend/hermes_agent.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/hermes_agent.py)
- [web-ui/backend/main.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/main.py)
- [web-ui/backend/test_backend.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/test_backend.py)
- [web-ui/frontend/src/App.tsx](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/App.tsx)
- [web-ui/frontend/src/components/ChatWindow.tsx](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/components/ChatWindow.tsx)
- [web-ui/frontend/src/api/chat.ts](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/api/chat.ts)
