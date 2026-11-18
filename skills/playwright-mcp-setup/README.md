# playwright-mcp-setup

让 Agent 通过 Playwright MCP + 官方浏览器扩展控制日常 Chrome/Edge/Chromium 的已登录标签页：免调试端口、免独立浏览器、免 Node 安装。技能引导完成环境搭建；二进制 kit（便携 node.exe、运行时离线包、扩展离线包）经本仓库 GitHub Release 分发，版本配套见本目录 `VERSIONS.md`。

## 安装方式一：skills marketplace

使用 cc-switch 等可接入自定义 marketplace 的工具：添加仓库 `25lonelyboy/wewant-skills`，发现并安装 `playwright-mcp-setup`，`skills/playwright-mcp-setup/` 子树即投递到各 agent。后续更新同样经 marketplace 拉取。

## 安装方式二：提示词自安装

不使用 marketplace 或无法接入自定义 marketplace 时，复制下面整段提示词发给 Agent，由 Agent 自行完成安装：

```text
请安装 playwright-mcp-setup 技能：
1. 下载 https://github.com/25lonelyboy/wewant-skills/archive/refs/heads/master.zip 并解压（tar 报无法识别时改用 unzip 或资源管理器）。
2. 打开解压内容中的 skills/playwright-mcp-setup/VERSIONS.md，确认"技能修订"为 0.0.85-rev1；不一致说明仓库已更新，停止安装并告诉我实际修订号。
3. 把解压内容中的 skills/playwright-mcp-setup/ 目录（含全部子目录与文件）完整复制到你的用户级技能目录，目录名保持 playwright-mcp-setup。参考位置：Qoder Desktop/IDE 为 ~/.qoder-cn/skills/，Claude Code 为 ~/.claude/skills/，其他 agent 用对应的用户级技能目录。
4. 完成后提示我重启会话；重启后我会调用 /playwright-mcp-setup，届时按技能引导完成 Playwright MCP 浏览器接入。
```

自安装拉取 master 分支，内容会随仓库前进；第 2 步的修订号核对用于发现未预期的内容变化。GitHub 不可达时的兜底：请已有仓库的同事发送 `skills/playwright-mcp-setup/` 目录，放入用户级技能目录即可。

## 安装后

调用 `/playwright-mcp-setup [kit目录]`。kit 默认 `%USERPROFILE%/playwright-mcp-kit`，技能安装前会先与你确认位置；二进制自动从本仓库 Release 拉取并做 SHA256 校验。env-check 会按 `VERSIONS.md` 比对运行时、扩展与 Node 版本，随后引导扩展安装、token 配置、MCP 注册与冒烟验证。
