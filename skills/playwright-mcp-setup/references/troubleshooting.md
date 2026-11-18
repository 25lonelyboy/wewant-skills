# 排障表

症状按报错原文或现象匹配。修复后重跑冒烟（navigate about:blank → evaluate 1+1 → snapshot）。各步骤的事前场景预案见 `scenarios.md`。

## Node 运行时场景

不变式：runtime 的 node_modules 纯 JS 无原生模块，任何 Node ≥20 均可运行；捆绑 node.exe 提供确定性，默认配置的 command 用其绝对路径，不读 PATH。

| 场景 | 假设 | 处理 |
|---|---|---|
| 机器无 Node | 捆绑 node.exe 可用 | 默认配置，零安装 |
| 已有系统 Node（任意版本） | 配置走绝对路径 | 互不影响，无需处理 |
| nvm-windows 多版本 | `nvm use` 切换 PATH 符号链接 | 绝对路径免疫漂移；禁止把 command 写成 `"node"` |
| 捆绑 exe 被策略/杀软拦截 | env-check 启动探测 FAIL | 系统 Node ≥20 时 command 改 `"node"` 或具体版本绝对路径（`%APPDATA%/nvm/vX.Y.Z/node.exe`）；否则请 IT 加白 |
| 非 x64 架构 | 团队机器 win-x64 | ARM64 Windows 可仿真运行 x64 node.exe；或按 VERSIONS.md 换对应架构 |
| kit 路径含空格/中文 | spawn 无 shell、JSON 数组传参 | 已实测支持 |

## 连接类

| 症状 | 原因 | 修复 |
|---|---|---|
| `Playwright Extension not found in "<profile>"` | 该 profile 未装扩展，或扩展 ID 不符 | 在目标 profile 加载 `<kit>/extension`；跑 env-check 核对 ID；多 profile 用 `--profile-dir-name "<目录名>"` 指定（取 `chrome://version` 的 Profile Path 末段） |
| `Playwright extension did not connect within Ns ... PLAYWRIGHT_MCP_EXTENSION_TOKEN matches its token` | token 不匹配、扩展被禁用、连接页被拦截 | 到 Manage clients 页重新复制 token 更新配置；chrome://extensions 确认扩展已启用且无错误 |
| 连接页显示 `Invalid token provided` | token 已 Rotate 或复制错 profile 的 token | 用当前 profile Manage 页的 token 更新配置 |
| 连接页显示 `unsupported protocol version` / 提示更新扩展 | 运行时与扩展版本不配套 | 整套更换 kit 的 packages（见 VERSIONS.md），禁止只换一边 |
| 连接页显示 `only allows loopback connections` | relay 地址非 127.0.0.1 | 正常部署不会出现；检查是否自行改动了 server 监听配置 |
| 连接超时且 token/扩展状态均正常 | 代理软件（Proxifier 等）或防火墙拦截回环 WS、node.exe 本地监听 | 代理放行 127.0.0.1/[::1]；防火墙允许 node.exe 本地通信 |
| `"chrome" executable not found` / `Unsupported channel` | 浏览器不在标准安装位置 | args 加 `--executable-path "<exe绝对路径>"` |
| 打开连接页时 spawn 报 SxS / Permission denied / 应用程序无法启动 | Chrome 更新中间态：旧启动器引用的版本目录已被更新器删除 | 重启日常 Chrome 完成更新替换；或临时 `--executable-path` 指向可用启动器（更新待替换的 `new_chrome.exe`） |
| Agent 里看不到 browser_* 工具 | MCP 配置未生效 | 确认注册成功（Desktop 用 manage_app_mcp list_servers）；重启会话 |

## 会话类

| 症状 | 原因 | 修复 |
|---|---|---|
| 操作中途 debugger 断开，标签页失联 | 页面含受限 frame（`chrome://`、其他扩展注入的 `chrome-extension://` frame），Chrome 强制 detach | 在目标站点禁用注入 frame 的扩展，或其站点访问改为"点击时"；换无此类扩展的 profile |
| 某个标签页操作不到 | 标签页归属其他客户端或未归属本客户端 | 把标签页拖入本会话的 Playwright 标签组；Manage clients 页可查各客户端归属 |
| 浏览器窗口被反复切到前台 | 默认行为 | Chrome ≥158 且扩展 ≥0.5.0 时 args 加 `--background` |
| 多个会话互相干扰 | 每个会话各起一个 server、各占一个标签组，标签页独占归属 | 正常机制；用 `--session-name`/`--session-color` 区分标签组 |

## 安全边界

- 客户端可读浏览器级 cookie，不能修改浏览器级状态（加/清 cookie、授权限被拒绝）。
- 客户端只能操作自己拥有的标签页；连接审批或 token 决定归属。
- token 泄露等同交出浏览器控制权：Manage 页 Rotate token 即作废旧 token，更新配置后重启会话。