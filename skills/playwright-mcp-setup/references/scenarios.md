# 分步场景预案

按接入步骤组织。每步先列场景与处理，Agent 执行该步时对照预防；已发生的故障按症状查 `troubleshooting.md`。

## 0. kit 获取与落位

| 场景 | 假设 | 处理 |
|---|---|---|
| Release 下载中断/被截断 | 大文件经代理/网盘中转 | SHA256 与 VERSIONS.md 登记值比对，不符重新下载 |
| GitHub 不可达 | 网络受限机器 | 兜底：请已有 kit 的同事发送 binaries zip 或整个 kit 目录 |
| Release tag 与 VERSIONS.md 不符 | 技能与二进制版本漂移 | 以技能内 VERSIONS.md 登记的 tag 为准整套获取，禁止混用 |
| IM/网盘传输 zip | 含 exe 的 zip 可能被改名、拦截、截断 | 对照 VERSIONS.md 的 SHA256（`certutil -hashfile <zip> SHA256`）；被拦截改内网共享文件夹复制 |
| kit 放 OneDrive/同步盘 | 按需占位文件导致 node.exe 不在本地；扩展路径随同步失效 | 必须本地固定磁盘；env-check 对同步盘路径告警 |
| 路径过深 | Windows MAX_PATH 致 node_modules 解压不全 | 浅目录（建议盘符下 3 层内）；env-check 对深路径告警 |
| 路径含空格/中文 | spawn 无 shell、JSON 数组传参 | 已实测支持 |
| 升级时旧目录残留 | 合并覆盖留下旧文件 | 先删 runtime/ 与 extension/ 再解压 |

## 1. 解压离线包

| 场景 | 假设 | 处理 |
|---|---|---|
| 资源管理器解压长路径失败 | 传统 Explorer 限制 | 用 tar/unzip 命令行解压；解压后 env-check 验证完整性 |
| node.exe 被杀软隔离 | 便携 exe 常见误报 | 恢复并加白；或回退系统 Node ≥20（见 troubleshooting.md Node 场景） |

## 2. 安装扩展【人工】

| 场景 | 假设 | 处理 |
|---|---|---|
| 企业策略禁开发者模式 | ExtensionDeveloperModeSettings / ExtensionInstallBlocklist | 查 `chrome://policy`；需 IT 加白，无法绕过 |
| 已装商店版扩展 | 同官方 ID | 跳过加载步骤，env-check 显示已安装即可 |
| 商店版与解包版并存 | Duplicate ID 冲突 | 只保留一个 |
| 加载时选了 zip 文件 | Chrome 要求目录 | 先解压，选含 manifest.json 的目录 |
| 日常浏览器是 Edge | 默认通道 chrome | 注册时 args 加 `"--browser", "msedge"` |
| 多 profile | 扩展与 token 均按 profile | 装进实际使用的 profile；注册通过 `--profile-dir-name` 固定 |
| Chrome 更新后弹"禁用开发者模式扩展" | Windows Chrome 行为 | 选择保留；扩展按路径引用，更新不丢失 |
| 扩展加载后 service worker 报错 | 产物或兼容问题 | chrome://extensions 点"错误"查看；用 kit 离线包替换 |

## 3. 获取 token【人工】

| 场景 | 假设 | 处理 |
|---|---|---|
| 复制了别的 profile 的 token | 多 profile 各自独立 | 从目标 profile 的 Manage 页复制 |
| 清理浏览数据抹掉扩展存储 | token 重新生成 | 重新复制并更新配置 |
| Rotate 过 token | 旧 token 立即失效 | 更新配置并重启会话 |
| Manage 页打不开 | service worker 未运行 | chrome://extensions 重新加载扩展 |

token 为 base64url 字符集，JSON 无需转义；粘贴整行时去掉 `PLAYWRIGHT_MCP_EXTENSION_TOKEN=` 前缀。

## 4. 注册 MCP

| 场景 | 假设 | 处理 |
|---|---|---|
| 已有 playwright 条目 | add 不覆盖已有键 | 先 list_servers / get_config；update 或改用其他条目名 |
| Desktop 会话无 manage_app_mcp 工具 | 会话能力差异 | 直接编辑 `~/.qoder-cn/mcp.json`，合并 mcpServers 条目 |
| IDE 配置路径漂移 | 版本/安装方式差异 | 在 `%APPDATA%` 下搜 Qoder* 目录的 mcp.json（本机为 `QoderCN/SharedClientCache/mcp.json`）；写入后 JSON.parse 校验 |
| 配置写了不生效 | 客户端目录快照 | 重启会话 |
| 多会话各开标签页 | 每会话一个 server、一个标签组 | 正常机制；Chrome ≥158 且扩展 ≥0.5.0 可加 `--background` |

## 5. 首次连接与冒烟

| 场景 | 假设 | 处理 |
|---|---|---|
| 浏览器未运行 | server 自行 spawn 启动器打开连接页 | 正常路径；启动器损坏见 troubleshooting.md 连接类 |
| 30 秒连接超时 | token 不符、扩展未启用、代理拦截回环 | 核对 token 与扩展状态；代理软件（Proxifier 等）放行 127.0.0.1/[::1] |
| 防火墙/安全软件拦本地 WS | node.exe 监听端口 | 允许本地通信 |
| 会话工具目录未刷新 | 启动时快照 | smoke.cjs stdio 直驱验证；重启会话 |

## 6. 日常使用

| 场景 | 假设 | 处理 |
|---|---|---|
| kit 目录被移动 | 扩展路径引用失效、配置路径失效 | 重新加载扩展并更新配置；预防：路径一经安装不再动 |
| Chrome profile 重置/新建 | 扩展与 token 丢失 | 重装扩展、重取 token |
| 目标页含受限 frame | debugger 被 detach | 见 troubleshooting.md 会话类 |