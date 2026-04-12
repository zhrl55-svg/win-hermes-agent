<p align="center">
  <img src="assets/banner.png" alt="Hermes Agent" width="100%">
</p>

# Hermes Agent ☤ — Windows 原生适配分支

<p align="center">
  <a href="https://hermes-agent.nousresearch.com/docs/"><img src="https://img.shields.io/badge/Docs-hermes--agent.nousresearch.com-FFD700?style=for-the-badge" alt="文档"></a>
  <a href="https://discord.gg/NousResearch"><img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://github.com/NousResearch/hermes-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://nousresearch.com"><img src="https://img.shields.io/badge/Built%20by-Nous%20Research-blueviolet?style=for-the-badge" alt="Built by Nous Research"></a>
  <a href="https://github.com/win-hermes/win-hermes"><img src="https://img.shields.io/badge/Windows-Branch-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Windows 分支"></a>
</p>

> **这是 Hermes Agent 的 Windows 原生适配分支。** 所有代码针对 Windows 环境进行了专项优化，可在 Windows PowerShell / CMD 下直接运行，无需 WSL、WSL2 或虚拟机。

**这是 [Nous Research](https://nousresearch.com) 构建的自我改进 AI 智能体。** 它是唯一一个内置学习循环的智能体——从经验中创建技能、在使用中自我改进、推动自身保存知识、搜索自己的历史对话，并在多个会话中建立对你的深入模型。它可以运行在 $5 的 VPS、GPU 集群或几乎空闲时几乎不收费的无服务器基础设施上。它不依赖于你的笔记本电脑——当你在一台云 VM 上工作时，你可以通过 Telegram 与它对话。

支持任意你想要的模型——[Nous Portal](https://portal.nousresearch.com)、[OpenRouter](https://openrouter.ai)（200+ 模型）、[z.ai/GLM](https://z.ai)、[Kimi/Moonshot](https://platform.moonshot.ai)、[MiniMax](https://www.minimax.io)、OpenAI 或你自己的端点。使用 `hermes model` 切换——无需代码更改，无锁定。

<table>
<tr><td><b>真正的终端界面</b></td><td>完整的 TUI，支持多行编辑、斜杠命令自动补全、会话历史、打断重定向和流式工具输出。</td></tr>
<tr><td><b>生活在你的环境中</b></td><td>Telegram、Discord、Slack、WhatsApp、Signal 和 CLI——全部来自单一网关进程。语音备忘录转录，跨平台会话连续性。</td></tr>
<tr><td><b>闭环学习系统</b></td><td>智能体策划的记忆，带有定期提醒。复杂任务后自主创建技能。技能在使用中自我改进。FTS5 会话搜索配合 LLM 摘要实现跨会话记忆。<a href="https://github.com/plastic-labs/honcho">Honcho</a> 辩证用户建模。兼容 <a href="https://agentskills.io">agentskills.io</a> 开放标准。</td></tr>
<tr><td><b>定时自动化</b></td><td>内置 cron 调度器，支持投递到任意平台。日报告、夜间备份、周审计——全部用自然语言描述，无人值守运行。</td></tr>
<tr><td><b>委托与并行化</b></td><td>生成隔离的子智能体进行并行工作流。编写通过 RPC 调用工具的 Python 脚本，将多步骤管道折叠为零上下文成本的轮次。</td></tr>
<tr><td><b>Windows 原生适配</b></td><td>通过 Git Bash 原生 Windows 执行优化，无需 WSL、无虚拟机、无需额外配置。</td></tr>
<tr><td><b>浏览器自动化</b></td><td>通过 <code>agent-browser</code> CLI 技能实现无头浏览器自动化——可访问性树快照配合基于 ref 的确定性元素选择、会话隔离、状态持久化。在 Windows 上以 headless 模式运行，无需 GUI。安装：<code>npm install -g agent-browser</code>，首次使用前运行 <code>npx playwright install chromium</code>。</td></tr>
</table>

---

## 环境要求

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

## 快速安装

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

## 安装后

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

## 快速入门

```powershell
run-hermes.bat chat              # 交互式 CLI — 开始对话
run-hermes.bat model             # 选择 LLM provider 和模型
run-hermes.bat tools             # 配置启用的工具集
run-hermes.bat config set        # 设置单项配置值
run-hermes.bat gateway           # 启动消息网关（Telegram, Discord 等）
run-hermes.bat setup             # 运行完整配置向导
run-hermes.bat claw migrate      # 从 OpenClaw 迁移（如果需要）
run-hermes.bat doctor            # 诊断检查问题
```

📖 **[完整文档 →](https://hermes-agent.nousresearch.com/docs/)**

---

## 从 OpenClaw 迁移

如果你正在使用 OpenClaw，Hermes 可以自动导入你的设置、记忆、技能和 API Keys。

**首次安装时：** 安装向导（`hermes setup`）会自动检测 `~/.openclaw` 并在配置开始前提供迁移选项。

**安装后的任何时候：**

```powershell
run-hermes.bat claw migrate              # 交互式迁移（完整预设）
run-hermes.bat claw migrate --dry-run    # 预览将被迁移的内容
run-hermes.bat claw migrate --preset user-data   # 不含密钥的迁移
run-hermes.bat claw migrate --overwrite  # 覆盖现有冲突
```

将被导入的内容：
- **SOUL.md** — 人格文件
- **记忆** — MEMORY.md 和 USER.md 条目
- **技能** — 用户创建的技能 → `~/.hermes/skills/openclaw-imports/`
- **命令白名单** — 审批模式
- **消息设置** — 平台配置、允许的用户、工作目录
- **API 密钥** — 白名单密钥（Telegram、OpenRouter、OpenAI、Anthropic、ElevenLabs）
- **TTS 资源** — 工作区音频文件
- **工作区说明** — AGENTS.md（配合 `--workspace-target`）

---

## 社区

- 💬 [Discord](https://discord.gg/NousResearch)
- 📚 [Skills Hub](https://agentskills.io)
- 🐛 [Issues](https://github.com/win-hermes/win-hermes/issues)
- 💡 [Discussions](https://github.com/win-hermes/win-hermes/discussions)

---

## 参与贡献

我们欢迎贡献！查看[贡献指南](https://hermes-agent.nousresearch.com/docs/developer-guide/contributing)了解开发设置、代码风格和 PR 流程。

Windows 贡献者快速开始：

```powershell
# 克隆仓库
git clone https://github.com/win-hermes/win-hermes.git
cd win-hermes

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\activate

# 安装依赖
pip install -e ".[all,pty,cron,messaging,mcp,cli]"

# 运行测试
python -m pytest tests/ -q
```

---

## 许可证

MIT — 参见 [LICENSE](LICENSE)。

由 [Nous Research](https://nousresearch.com) 构建。
