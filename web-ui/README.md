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
- 模型下拉选择（支持多 provider + 多模型）
- 暗色模式切换
- 每轮覆盖 `model / provider / base_url`
- 浏览器实测验证前后端联通

未完成：
- 前端体验仍偏工程化，工具可视化还可以继续做
- `antd` 产物包仍然偏大

## 架构

```text
Browser
  -> React / Vite frontend (port 5173)
  -> FastAPI backend (port 8000)
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
- `~/.hermes/config.yaml`
- `~/.hermes/.env`

后端入口会调用 Hermes 自己的配置加载逻辑，而不是 `web-ui` 自己维护一份配置副本。

相关代码：[backend/hermes_agent.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/hermes_agent.py)

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

## 安装与启动

### 方式一：一键安装（推荐）

```powershell
# 安装 web-ui（npm 依赖 + 构建前端产物）
hermes webui install

# 启动后端（后台运行）
hermes webui start

# 停止后端
hermes webui stop

# 查看状态
hermes webui status

# 前台运行（调试用）
hermes webui serve
```

> `hermes webui install` 只需运行一次，之后直接用 `start` 即可。

### 方式二：手动启动

**后端：**

```powershell
cd web-ui\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

**前端：**

```powershell
cd web-ui\frontend
npm install
npm run dev
```

前端地址：[http://localhost:5173](http://localhost:5173)  
后端地址：[http://127.0.0.1:8000](http://127.0.0.1:8000)

如果前后端分开跑，可以指定前端 API 地址：

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

### 开机自启（Windows）

```powershell
# 需要管理员权限
hermes gateway install

# 立即启动（不等待登录）
hermes gateway start

# 查看状态
hermes gateway status
```

- Gateway 安装为 Windows Task Scheduler 任务，登录时自动启动
- Linux → systemd，macOS → launchd，Windows → Task Scheduler

## 前端界面说明

| 功能 | 说明 |
|------|------|
| 会话标题 | 输入框内填写，可随时重命名 |
| 模型下拉 | 从 `runtime.available_models` 动态读取，支持多 provider |
| 暗色模式 | Header 右上角 ☀️/🌙 图标一键切换 |
| 会话列表 | 左侧抽屉，点击切换历史会话 |
| 新建会话 | Header 右上角 **New** 按钮 |
| 删除会话 | 会话列表右侧 × 按钮 |
| 中断运行 | 标题栏 **Stop** 按钮（流式输出中显示） |
| 发送消息 | `Enter` 发送，`Shift+Enter` 换行 |

## 主要接口

后端入口：[backend/main.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/main.py)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 基础信息 |
| `/health` | GET | 健康检查 |
| `/runtime` | GET | 运行时信息（模型、provider、可用模型列表） |
| `/chat/stream` | POST | SSE 流式对话 |
| `/ws/chat/{session_id}` | WebSocket | WebSocket 对话 |
| `/sessions` | GET | 会话列表 |
| `/sessions/{session_id}` | GET | 加载指定会话 |
| `/sessions/{session_id}` | PATCH | 重命名会话 |
| `/sessions/{session_id}/interrupt` | POST | 中断运行中会话 |
| `/sessions/{session_id}` | DELETE | 删除会话 |

## 测试命令

### 后端

```powershell
hermes webui install    # 首次需要
hermes webui start
hermes webui status

# 或者手动运行
python -m pytest web-ui\backend\test_backend.py -q
```

### 前端

```powershell
cd web-ui\frontend
npm run lint
npm run build
```

## 目录结构

```text
web-ui/
├── backend/
│   ├── hermes_agent.py   # Hermes 运行时适配层
│   ├── main.py            # FastAPI 入口
│   ├── requirements.txt   # Python 依赖
│   └── test_backend.py    # 后端测试
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # 根组件（布局 + 会话管理）
│   │   ├── components/
│   │   │   └── ChatWindow.tsx     # 聊天界面组件
│   │   ├── api/
│   │   │   └── chat.ts            # API 客户端
│   │   └── index.css              # 全局样式
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

## 关键文件

- [backend/hermes_agent.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/hermes_agent.py)
- [backend/main.py](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/backend/main.py)
- [frontend/src/App.tsx](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/App.tsx)
- [frontend/src/components/ChatWindow.tsx](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/components/ChatWindow.tsx)
- [frontend/src/api/chat.ts](file:///C:/Users/zhrl5/Documents/GitHub/win-hermes/web-ui/frontend/src/api/chat.ts)

## 已知限制

1. Web 端目前偏向"共享 Hermes 运行时的会话控制台"，还不是 CLI 全命令中心。
2. `antd` 相关 chunk 较大（~233KB gzip），后续可进一步分包或替换部分组件。
3. 真实响应是否成功，仍取决于 Hermes 主配置里的模型和凭据是否可用。
