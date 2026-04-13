<p align="center">
  <img src="assets/banner.png" alt="Hermes Agent" width="100%">
</p>

# Hermes Agent ☤ — Windows Branch

<p align="center">
  <a href="https://hermes-agent.nousresearch.com/docs/"><img src="https://img.shields.io/badge/Docs-hermes--agent.nousresearch.com-FFD700?style=for-the-badge" alt="Documentation"></a>
  <a href="https://discord.gg/NousResearch"><img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://github.com/NousResearch/hermes-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://nousresearch.com"><img src="https://img.shields.io/badge/Built%20by-Nous%20Research-blueviolet?style=for-the-badge" alt="Built by Nous Research"></a>
  <a href="https://github.com/win-hermes/win-hermes"><img src="https://img.shields.io/badge/Windows-Branch-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Windows Branch"></a>
</p>

> **This is the Windows native adaptation branch of Hermes Agent.** All code has been specially optimized for the Windows environment and can run directly under Windows PowerShell / CMD without WSL, WSL2, or virtual machines.

**The self-improving AI agent built by [Nous Research](https://nousresearch.com).** It's the only agent with a built-in learning loop — it creates skills from experience, improves them during use, nudges itself to persist knowledge, searches its own past conversations, and builds a deepening model of who you are across sessions. Run it on a $5 VPS, a GPU cluster, or serverless infrastructure that costs nearly nothing when idle. It's not tied to your laptop — talk to it from Telegram while it works on a cloud VM.

Use any model you want — [Nous Portal](https://portal.nousresearch.com), [OpenRouter](https://openrouter.ai) (200+ models), [z.ai/GLM](https://z.ai), [Kimi/Moonshot](https://platform.moonshot.ai), [MiniMax](https://www.minimax.io), OpenAI, or your own endpoint. Switch with `hermes model` — no code changes, no lock-in.

<table>
<tr><td><b>A real terminal interface</b></td><td>Full TUI with multiline editing, slash-command autocomplete, conversation history, interrupt-and-redirect, and streaming tool output.</td></tr>
<tr><td><b>Lives where you do</b></td><td>Telegram, Discord, Slack, WhatsApp, Signal, and CLI — all from a single gateway process. Voice memo transcription, cross-platform conversation continuity.</td></tr>
<tr><td><b>A closed learning loop</b></td><td>Agent-curated memory with periodic nudges. Autonomous skill creation after complex tasks. Skills self-improve during use. FTS5 session search with LLM summarization for cross-session recall. <a href="https://github.com/plastic-labs/honcho">Honcho</a> dialectic user modeling. Compatible with the <a href="https://agentskills.io">agentskills.io</a> open standard.</td></tr>
<tr><td><b>Scheduled automations</b></td><td>Built-in cron scheduler with delivery to any platform. Daily reports, nightly backups, weekly audits — all in natural language, running unattended.</td></tr>
<tr><td><b>Delegates and parallelizes</b></td><td>Spawn isolated subagents for parallel workstreams. Write Python scripts that call tools via RPC, collapsing multi-step pipelines into zero-context-cost turns.</td></tr>
<tr><td><b>Runs anywhere, not just your laptop</b></td><td>Six terminal backends — local, Docker, SSH, Daytona, Singularity, and Modal. Daytona and Modal offer serverless persistence — your agent's environment hibernates when idle and wakes on demand, costing nearly nothing between sessions. Run it on a $5 VPS or a GPU cluster.</td></tr>
<tr><td><b>Research-ready</b></td><td>Batch trajectory generation, Atropos RL environments, trajectory compression for training the next generation of tool-calling models.</td></tr>
<tr><td><b>Windows-native</b></td><td>Optimized for native Windows execution via Git Bash. No WSL, no虚拟机, no额外配置 required.</td></tr>
<tr><td><b>Browser Automation</b></td><td>Headless browser automation via <code>agent-browser</code> CLI skill — accessibility tree snapshots with ref-based element selection, session isolation, state persistence. Works on Windows without GUI. 安装：<code>npm install -g agent-browser</code>，首次使用前运行 <code>npx playwright install chromium</code>。</td></tr>
</table>

---

## Prerequisites

- **Python 3.11+** — [下载链接](https://www.python.org/downloads/)
- **Git for Windows (Git Bash)** — [下载链接](https://git-scm.com/download/win)

> Git Bash 是 Windows 下的 POSIX 兼容层，Hermes Agent 的终端执行（terminal tool）依赖 Git Bash 环境。安装时请确保勾选 **"Git Bash"** 和 **"Use Git from the Windows Command Prompt"**。

> **浏览器自动化（可选）：** 内置 `browser` 工具支持无头浏览器操作。如需更高级的 CLI 驱动自动化（含可访问性树快照和基于 ref 的确定性元素选择），可安装 `agent-browser` 技能：
> ```powershell
> npm install -g agent-browser
> npx playwright install chromium
> ```
> `agent-browser` 在 Windows 上以 headless 模式运行，无需 GUI。浏览器二进制文件会自动下载到 `~/.cache/ms-playwright/`。

---

## Quick Install

### 方式一：双击运行（推荐）

```powershell
# 1. 克隆项目
git clone https://github.com/win-hermes/win-hermes.git
cd win-hermes

# 2. 安装依赖（使用系统 Python）
pip install -e ".[all,pty,cron,messaging,mcp,cli]"

# 3. 双击运行（或命令行运行）
run-hermes.bat
```

### 方式二：命令行安装

```powershell
# 克隆
git clone https://github.com/win-hermes/win-hermes.git
cd win-hermes

# 安装依赖
pip install -e ".[all,pty,cron,messaging,mcp,cli]"

# 启动交互式聊天
python -m hermes_cli.main chat

# 或使用启动脚本
.\run-hermes.bat chat
```

### 方式三：开发者模式安装

```powershell
# 克隆
git clone https://github.com/win-hermes/win-hermes.git
cd win-hermes

# 创建虚拟环境（可选）
python -m venv venv
.\venv\Scripts\activate

# 安装所有依赖
pip install -e ".[all,pty,cron,messaging,mcp,cli]"

# 运行测试
python -m pytest tests/ -q
```

### 方式四：从 NousResearch 原版迁移

如果你已经在 Linux/macOS/WSL 上使用 Hermes Agent，只需将项目替换为 Windows 分支：

```powershell
# 重新克隆 Windows 分支
git remote set-url origin https://github.com/win-hermes/win-hermes.git
git pull

# 重新安装依赖（Windows 环境下）
pip install -e ".[all,pty,cron,messaging,mcp,cli]"
```

> 注意：所有 `~/.hermes/` 配置、记忆文件、API Keys 均可在 Windows 上直接复用（位于 `%USERPROFILE%\.hermes`）。

---

## After Installation

**双击运行：**
```
双击 run-hermes.bat  # 直接启动交互式聊天
```

**命令行运行：**
```powershell
# 交互式聊天
run-hermes.bat chat

# 选择模型和 Provider
run-hermes.bat model

# 诊断检查
run-hermes.bat doctor

# 启动消息网关（Telegram / Discord 等）
run-hermes.bat gateway

# 完整配置向导
run-hermes.bat setup

# 迁移 OpenClaw（如需要）
run-hermes.bat claw migrate
```

---

## Getting Started

```powershell
run-hermes.bat chat              # 交互式 CLI — 开始对话
run-hermes.bat model             # 选择 LLM provider 和模型
run-hermes.bat tools             # 配置启用的工具集
run-hermes.bat config set        # 设置单项配置值
run-hermes.bat gateway            # 启动消息网关（Telegram, Discord 等）
run-hermes.bat setup             # 运行完整配置向导
run-hermes.bat claw migrate       # 从 OpenClaw 迁移（如果需要）
run-hermes.bat doctor             # 诊断检查问题
```

📖 **[完整文档 →](https://hermes-agent.nousresearch.com/docs/)**

## CLI vs Messaging Quick Reference

Hermes has two entry points: start the terminal UI with `hermes`, or run the gateway and talk to it from Telegram, Discord, Slack, WhatsApp, Signal, or Email. Once you're in a conversation, many slash commands are shared across both interfaces.

| Action | CLI | Messaging platforms |
|---------|-----|---------------------|
| Start chatting | `hermes` / `run-hermes.bat chat` | Run `hermes gateway setup` + `hermes gateway start`, then send the bot a message |
| Start fresh conversation | `/new` or `/reset` | `/new` or `/reset` |
| Change model | `/model [provider:model]` | `/model [provider:model]` |
| Set a personality | `/personality [name]` | `/personality [name]` |
| Retry or undo the last turn | `/retry`, `/undo` | `/retry`, `/undo` |
| Compress context / check usage | `/compress`, `/usage`, `/insights [--days N]` | `/compress`, `/usage`, `/insights [days]` |
| Browse skills | `/skills` or `/<skill-name>` | `/skills` or `/<skill-name>` |
| Interrupt current work | `Ctrl+C` or send a new message | `/stop` or send a new message |
| Platform-specific status | `/platforms` | `/status`, `/sethome` |

For the full command lists, see the [CLI guide](https://hermes-agent.nousresearch.com/docs/user-guide/cli) and the [Messaging Gateway guide](https://hermes-agent.nousresearch.com/docs/user-guide/messaging).

---

## Web UI

Hermes Agent 附带一个可选的 Web 界面（FastAPI + React），支持浏览器登录、会话管理、模型选择。

详情见 **[web_ui/README.md](web_ui/README.md)**。

快速启动：

```powershell
cd web_ui
run-web-ui.bat
# 访问 http://localhost:5173
# 账号：admin / admin123
```

---

## Documentation

All documentation lives at **[hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/)**:

| Section | What's Covered |
|---------|---------------|
| [Quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart) | Install → setup → first conversation in 2 minutes |
| [CLI Usage](https://hermes-agent.nousresearch.com/docs/user-guide/cli) | Commands, keybindings, personalities, sessions |
| [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) | Config file, providers, models, all options |
| [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging) | Telegram, Discord, Slack, WhatsApp, Signal, Home Assistant |
| [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security) | Command approval, DM pairing, container isolation |
| [Tools & Toolsets](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools) | 40+ tools, toolset system, terminal backends |
| [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) | Procedural memory, Skills Hub, creating skills |
| [Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) | Persistent memory, user profiles, best practices |
| [MCP Integration](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) | Connect any MCP server for extended capabilities |
| [Cron Scheduling](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron) | Scheduled tasks with platform delivery |
| [Context Files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files) | Project context that shapes every conversation |
| [Architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) | Project structure, agent loop, key classes |
| [Contributing](https://hermes-agent.nousresearch.com/docs/developer-guide/contributing) | Development setup, PR process, code style |
| [CLI Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) | All commands and flags |
| [Environment Variables](https://hermes-agent.nousresearch.com/docs/reference/environment-variables) | Complete env var reference |

---

## Migrating from OpenClaw

If you're coming from OpenClaw, Hermes can automatically import your settings, memories, skills, and API keys.

**During first-time setup:** The setup wizard (`hermes setup`) automatically detects `~/.openclaw` and offers to migrate before configuration begins.

**Anytime after install:**

```powershell
run-hermes.bat claw migrate              # Interactive migration (full preset)
run-hermes.bat claw migrate --dry-run    # Preview what would be migrated
run-hermes.bat claw migrate --preset user-data   # Migrate without secrets
run-hermes.bat claw migrate --overwrite  # Overwrite existing conflicts
```

What gets imported:
- **SOUL.md** — persona file
- **Memories** — MEMORY.md and USER.md entries
- **Skills** — user-created skills → `~/.hermes/skills/openclaw-imports/`
- **Command allowlist** — approval patterns
- **Messaging settings** — platform configs, allowed users, working directory
- **API keys** — allowlisted secrets (Telegram, OpenRouter, OpenAI, Anthropic, ElevenLabs)
- **TTS assets** — workspace audio files
- **Workspace instructions** — AGENTS.md (with `--workspace-target`)

See `hermes claw migrate --help` for all options, or use the `openclaw-migration` skill for an interactive agent-guided migration with dry-run previews.

---

## Contributing

We welcome contributions! See the [Contributing Guide](https://hermes-agent.nousresearch.com/docs/developer-guide/contributing) for development setup, code style, and PR process.

Quick start for contributors (Windows):

```powershell
# Clone the repo
git clone https://github.com/win-hermes/win-hermes.git
cd win-hermes

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -e ".[all,pty,cron,messaging,mcp,cli]"

# Run tests
python -m pytest tests/ -q
```

---

## Community

- 💬 [Discord](https://discord.gg/NousResearch)
- 📚 [Skills Hub](https://agentskills.io)
- 🐛 [Issues](https://github.com/win-hermes/win-hermes/issues)
- 💡 [Discussions](https://github.com/win-hermes/win-hermes/discussions)
- 🔌 [HermesClaw](https://github.com/AaronWong1999/hermesclaw) — Community WeChat bridge: Run Hermes Agent and OpenClaw on the same WeChat account.

---

## License

MIT — see [LICENSE](LICENSE).

Built by [Nous Research](https://nousresearch.com).
