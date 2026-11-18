---
name: playwright-mcp-setup
description: 安装配置 Playwright MCP + 浏览器扩展，让 Agent 通过扩展控制用户日常 Chrome/Edge/Chromium 的已登录标签页（免调试端口、免独立浏览器）。当用户要求搭建浏览器自动化基础设施、接入 Playwright MCP、安装 Playwright 扩展、配置浏览器连接器，或排查扩展/MCP 连接失败时使用。参数为 kit 目录路径，可省略。
argument-hint: [kit目录]
---

# Playwright MCP + 扩展接入

## Overview

通过官方 Playwright Extension（chrome.debugger）把用户日常浏览器接入 Playwright MCP server。Agent 操作的是用户已登录的真实标签页；不启动独立浏览器、不需要调试端口。二进制 kit（便携 node.exe、运行时离线包、扩展离线包）经 GitHub Release 分发，目标机器零前置安装。

路径占位符：`<skill>` = 本 SKILL.md 所在目录；`<kit>` = 二进制 kit 目录，默认 `%USERPROFILE%/playwright-mcp-kit`，用户指定时以参数为准。

```
<kit>/
├── packages/    运行时 zip + 扩展 zip（离线分发件）
├── node/node.exe  便携 Node 运行时（默认 command，绝对路径免疫 nvm/PATH 漂移）
├── runtime/     解压后的运行时，入口 runtime/node_modules/@playwright/mcp/cli.js
├── extension/   解压后的扩展，chrome://extensions 加载此目录
└── .output/     MCP 快照/截图输出目录

<skill>/
├── SKILL.md、README.md（含自安装提示词）
├── VERSIONS.md  版本配套、Release 地址、SHA256、env-check 期望值
├── templates/mcp-config.json   配置模板，占位符 <KIT_DIR>、<TOKEN>
├── scripts/     env-check.cjs、smoke.cjs
└── references/  scenarios.md（分步场景预案）、troubleshooting.md（排障表）
```

kit 目录一经安装扩展必须保持路径稳定：Chrome 按路径引用已解压扩展，移动目录会导致扩展失效。版本配套见 `<skill>/VERSIONS.md`，运行时与扩展必须整套更换；env-check 会按该文件的期望值比对版本。

## 接入流程

按顺序执行，每步完成后验证再进入下一步。标注【人工】的步骤必须由用户操作，给出明确指引后等待用户确认。各步骤可能遇到的场景与处理预案见 `references/scenarios.md`。

### 1. 确认位置并获取 kit

先向用户确认 kit 安装位置（默认 `%USERPROFILE%/playwright-mcp-kit`，建议本地固定磁盘浅目录，避开同步盘），确认后再动手。

kit 缺 `node/node.exe` 或 `packages/` 时获取二进制；已安装 kit 的版本由第 3 步比对，版本不一致时回到本节按升级流程重取。按 `<skill>/VERSIONS.md` 记录的 Release 地址下载 binaries zip，校验 SHA256 后解压到 kit 目录：

```bash
mkdir -p <kit>
curl -L -o <kit>/kit-binaries.zip <VERSIONS.md 中的 Release 资产地址>
certutil -hashfile <kit>/kit-binaries.zip SHA256   # 与 VERSIONS.md 登记值比对
rm -rf <kit>/packages <kit>/runtime <kit>/extension   # 升级时先清旧包；首次安装为空操作
tar -xf <kit>/kit-binaries.zip -C <kit>           # 或资源管理器解压
```

校验不符说明传输不完整，重新下载（慢速网络大文件可用 `curl -C -` 断点续传）。GitHub 不可达时走兜底：请已有 kit 的同事发送 binaries zip 或整个 kit 目录。获取完成后删除 kit-binaries.zip。

### 2. 解压离线包（缺失或升级时）

`runtime/` 或 `extension/` 缺失时，解压 `packages/` 下对应 zip 到同名目录。升级换包时第 1 步已删除旧目录；手动操作时也要先删旧 `runtime/`、`extension/`，避免残留旧文件。

```bash
mkdir -p <kit>/runtime <kit>/extension
tar -xf <kit>/packages/playwright-mcp-*-runtime.zip -C <kit>/runtime
tar -xf <kit>/packages/playwright-extension-*-unpacked.zip -C <kit>/extension
```

资源管理器解压长路径可能失败；失败时改用 tar/unzip 命令行。解压后进入第 3 步。

### 3. 环境检查

```bash
<kit>/node/node.exe <skill>/scripts/env-check.cjs <kit>
```

捆绑 node.exe 被拦截且系统 Node ≥20 时改用 `node` 运行。脚本读取 `VERSIONS.md` 的「env-check 期望值」，比对 kit 内的运行时、扩展与 Node 版本，并检查扩展 ID、service worker、商店版/解包版、禁用与残留记录、profile 安装状态、落位风险。逐项输出 OK/WARN/FAIL/INFO。

FAIL 项按提示修复后重跑，直到仅剩"扩展未安装/扩展已禁用"类人工项；版本不一致时回到第 1 步按升级流程重取。WARN 项（同步盘、深路径、解包路径漂移等）按 `references/scenarios.md` 对应步骤处理。浏览器使用非默认 user-data-dir 时追加 `--user-data-dir <目录>`，让检查器扫描该目录。

### 4. 安装扩展【人工】

env-check 显示目标 profile 已装商店版且版本与 VERSIONS 一致时跳过本步；版本不一致时先把商店扩展更新到登记版本，或改用离线包，禁止单边升级。

多 profile 时只装进实际使用的 profile。

指引用户：
1. 日常 Chrome 或 Chromium 打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
2. 打开右上角"开发者模式"。
3. 点"加载已解压的扩展程序"，选择 `<kit>/extension` 目录（选目录，选 zip 会失败）。
4. 确认列表出现 "Playwright Extension"，ID 为 `mmlmfjhmonkocbjadbfplnigmagldckm`，版本与 VERSIONS 登记值一致。

ID 不符时禁止继续：MCP server 按官方 ID 打开连接页。离线包 manifest 内置官方公钥，正常加载即得官方 ID；不符说明加载了错误目录。
企业策略禁用开发者模式时（加载按钮灰色或报错），告知用户需 IT 加白（可查 `chrome://policy`），无法绕过。
完成后重跑 env-check 确认"已安装扩展"。

### 5. 获取 token【人工】

指引用户：点击浏览器工具栏的 Playwright Extension 图标（拼图图标内）→ 打开扩展页（连接页上的 Manage clients 入口，页面标题为 Playwright Extension）→ Token 卡片点复制按钮，把整行 `PLAYWRIGHT_MCP_EXTENSION_TOKEN=...` 粘贴给 Agent。
token 按浏览器 profile 唯一，取哪个 profile 的 token 就连哪个 profile；注册时用同一个 profile。清理浏览数据会重置扩展存储中的 token，Rotate 会使旧 token 失效，两种情况都需重新复制并更新配置（见 `references/scenarios.md`）。

token 是凭据：只写入本机 MCP 配置或进程环境变量，禁止写入仓库、知识库、交付包、日志与命令行参数。

### 6. 注册 MCP

用 `<skill>/templates/mcp-config.json` 生成配置：`<KIT_DIR>` 替换为 kit 绝对路径（正斜杠），`<TOKEN>` 替换为 token 值（不含 `PLAYWRIGHT_MCP_EXTENSION_TOKEN=` 前缀）。

command 固定用 kit 内 node.exe 绝对路径：目标机有无 Node、nvm 切到什么版本都不影响。仅当捆绑 exe 被企业策略/杀软拦截（env-check 启动探测 FAIL）且系统 Node ≥20 时，command 改 `"node"` 或 nvm 具体版本绝对路径；场景矩阵见 `references/troubleshooting.md`。

模板中 `--output-dir` 把快照/截图落到 kit 内 `.output/`，必须保留：缺省会写进当前项目工作树，污染仓库。

按浏览器与 profile 追加参数：
- 日常浏览器是 Edge：args 追加 `"--browser", "msedge"`（默认通道 chrome）。
- 日常浏览器是 Chromium：`--browser` 没有 chromium 通道，args 追加 `"--executable-path", "<chromium.exe 绝对路径>"`。
- 浏览器使用非默认 user-data-dir：args 追加 `"--user-data-dir", "<目录>"`。
- 多 profile：args 追加 `"--profile-dir-name", "<目录名>"`（取 `chrome://version` 的 Profile Path 末段），token 必须来自同一 profile；不加时 server 选最后一个装扩展的 profile。
- 浏览器启动器损坏（Chrome 更新中间态，spawn 报 SxS/Permission denied）或浏览器不在标准位置：用 `--executable-path` 指向可用浏览器 exe。

- **Qoder Desktop**：优先用 `mcp__qoder-settings__manage_app_mcp` 的 `add`（name 用 `playwright`，config 为模板中该条目对象）。已存在同名条目时：`list_servers` 取 `serverId` → `get_config`（传 `serverId` 与 `scopeKind`，取回 `sourceRevision`）→ `update`（传 `serverId`、`expectedSourceRevision` 取上一步的值、`config`）。project 作用域另需 `projectDirectory`。会话无该工具时直接编辑 `~/.qoder-cn/mcp.json`，合并 `mcpServers` 条目。
- **Qoder IDE**：配置文件在 `%APPDATA%` 下 Qoder* 目录（本机为 `QoderCN/SharedClientCache/mcp.json`，其他安装可能不同，先搜索定位），先读现有内容，把 `playwright` 条目合并进 `mcpServers`，保留其他条目。
- **其他 MCP 客户端**：模板即标准 `mcpServers` JSON，按客户端方式导入。

手工编辑配置文件后必须 JSON 解析校验，再重启会话生效。

### 7. 冒烟验证

注册后当前会话的工具目录可能未刷新（`mcp_list` 查不到 browser_* 属预期）。两种验证方式：

**方式 A：stdio 直驱（不依赖会话刷新，注册前后均可用）**

```bash
export PLAYWRIGHT_MCP_EXTENSION_TOKEN=<token>
<kit>/node/node.exe <skill>/scripts/smoke.cjs <kit> \
  [--browser msedge] [--profile-dir-name "<目录名>"] \
  [--executable-path "<浏览器exe>"] [--user-data-dir "<目录>"]
unset PLAYWRIGHT_MCP_EXTENSION_TOKEN
```

token 只走环境变量，不放进命令行参数。参数与 MCP 配置保持一致：Edge 传 `--browser msedge`，Chromium 传 `--executable-path`，多 profile 传 `--profile-dir-name`，非默认数据目录传 `--user-data-dir`。脚本自行拉起 MCP server 跑 navigate/evaluate/snapshot，输出 `RESULT: PASS` 即链路全通；失败时打印 stderr 尾部。

**方式 B：会话内工具**

提示用户重启会话或重载 MCP 后，依次调用：
1. `browser_navigate` → `about:blank`
2. `browser_evaluate` → `() => 1 + 1`，期望返回 2
3. `browser_snapshot` → 期望拿到页面快照

首次连接时浏览器会出现 Playwright 标签组和一个新标签页，属预期；断开后标签组变灰保留，可手动关闭。三步通过即接入完成。

## 失败处理

连接失败、工具不可用、debugger 中途断开等，读 `references/troubleshooting.md` 按症状定位。修复后重跑冒烟。

## Resources

- `VERSIONS.md`：版本配套、Release 资产地址与 SHA256、env-check 期望值、技能修订、升级流程
- `templates/mcp-config.json`：MCP 配置模板
- `scripts/env-check.cjs`：前置检查（Node、运行时、扩展 ID/版本、禁用与残留记录、profile 安装状态、落位风险）
- `scripts/smoke.cjs`：stdio 直驱 MCP server 的端到端冒烟（navigate/evaluate/snapshot）
- `references/scenarios.md`：分步场景预案（获取/解压/检查/扩展/token/注册/冒烟/日常使用）
- `references/troubleshooting.md`：症状→原因→修复排障表
