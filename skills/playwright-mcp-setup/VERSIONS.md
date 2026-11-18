# 版本清单

整套 pin 死，运行时与扩展必须一起更换，禁止单边升级。

| 组件 | 版本 | 来源 |
|---|---|---|
| 便携 Node | v24.22.3（LTS Krypton，win-x64） | cdn.npmmirror.com/binaries/node/v24.22.3/node-v24.22.3-win-x64.zip，仅提取 node.exe 放 `node/` |
| @playwright/mcp | 0.0.85 | npm（registry.npmmirror.com 可达），依赖 playwright / playwright-core 1.66.0-alpha-2026-11-09 |
| Playwright Extension | 0.5.0 | microsoft/playwright 仓库 commit 8124fc39233c4c349b9dbebd4abc4103738eae81（2026-11-18），本地 vite 构建 |
| 扩展↔server 协议 | 2 | 双方源码常量一致（server VERSION=2，扩展 SUPPORTED_PROTOCOL_VERSION=2） |
| 扩展官方 ID | mmlmfjhmonkocbjadbfplnigmagldckm | manifest 内置官方公钥，加载已解压扩展后 ID 与商店版一致 |

## 构建工具（仅重建扩展时需要）

vite 8.1.6、@vitejs/plugin-react 6.0.3、vite-plugin-static-copy 3.4.0、react / react-dom 19.2.7、typescript 6.0.3。
构建产物 service worker 输出为 `lib/background.js`，需重命名为 manifest 引用的 `lib/background.mjs`。

## 环境要求

- Node ≥ 20：kit 已捆绑 v24.22.3 win-x64 node.exe，目标机零前置；runtime 纯 JS 无原生模块，回退系统 Node ≥20 亦可运行
- 架构假设 win-x64；其他架构从同一镜像下载对应包（如 win-arm64），替换 `node/node.exe` 即可
- Chrome / Edge / Chromium（MV3）；`--background` 另需扩展 ≥0.5.0、Chrome ≥158.0.8127.2
- Windows 团队环境；配置路径按 Windows 给出

## Release 分发

二进制 kit 经 wewant-skills 仓库 GitHub Release 分发，技能获取时以本节登记的地址与哈希为准：

- tag：`playwright-mcp-kit-v0.0.85`
- 资产：`playwright-mcp-kit-0.0.85-binaries.zip`（含 `node/node.exe` + `packages/` 两个 zip，113,920,000 bytes）
- 地址：https://github.com/25lonelyboy/wewant-skills/releases/download/playwright-mcp-kit-v0.0.85/playwright-mcp-kit-0.0.85-binaries.zip
- SHA256：`fa3cfef0bcc09ee71685da4654edc71413fe00ce432079e4aab4983ee83549af`

## 离线包

- `packages/playwright-mcp-0.0.85-runtime.zip`：package.json + package-lock.json + 完整 node_modules，解压到 `runtime/`，入口 `runtime/node_modules/@playwright/mcp/cli.js`
- `packages/playwright-extension-0.5.0-unpacked.zip`：构建产物，解压到 `extension/`，chrome://extensions 加载已解压扩展

传输完整性校验（`certutil -hashfile <文件> SHA256`）：

| 文件 | SHA256 |
|---|---|
| packages/playwright-mcp-0.0.85-runtime.zip | 948fd2800e32e6b3e5abb4b54267f72ffd6327483d7818398bdc9cabc63f334a |
| packages/playwright-extension-0.5.0-unpacked.zip | ab3ec2a354f5999ae7b524ea633025fef766e1a1be614178e5e6de6755b2a61a |
| node/node.exe | 86fc4785327db5f5c7558dc6156c543b433c313e813a222e088086222ab4afa6 |

## 升级流程

1. 选定新的 @playwright/mcp 版本，重建运行时 zip。
2. 取对应 playwright 仓库 commit 的 packages/extension 源码重建扩展 zip（协议版本变化时双方必须同升）。
3. 如需升级 Node，从镜像下载对应版本架构包替换 `node/node.exe`。
4. 用仓库 `dev/build-kit-release.cjs` 打新 binaries zip，更新本清单（tag、地址、SHA256），提交推送，`gh release create` 挂新 tag 资产。
5. 使用方经 marketplace 更新技能后重跑接入流程：替换 runtime/ 与 extension/，chrome://extensions 重新加载扩展，重启会话。