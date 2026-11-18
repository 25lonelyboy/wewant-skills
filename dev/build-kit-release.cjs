#!/usr/bin/env node
// 用法: node dev/build-kit-release.cjs <kit目录> [输出zip]
// 从本地 kit 组装 node/ + packages/ 为 binaries zip，输出 SHA256，供挂 GitHub Release。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const kit = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(kit)) {
  console.error('用法: node dev/build-kit-release.cjs <kit目录> [输出zip]');
  process.exit(1);
}
for (const r of ['node/node.exe', 'packages']) {
  if (!fs.existsSync(path.join(kit, r))) { console.error('缺失 ' + path.join(kit, r)); process.exit(1); }
}
const zips = fs.readdirSync(path.join(kit, 'packages')).filter(f => f.endsWith('.zip'));
if (zips.length !== 2) { console.error('packages/ 应恰有 2 个 zip（运行时 + 扩展），当前 ' + zips.length); process.exit(1); }

const out = path.resolve(process.argv[3] || 'playwright-mcp-kit-binaries.zip');
// tar 把盘符冒号当远端主机语法，全程用相对路径执行
const tmpName = '.kit-binaries-' + process.pid + '.zip';
execFileSync('tar', ['-a', '-cf', tmpName, '-C', path.basename(kit), 'node', 'packages'], { cwd: path.dirname(kit), stdio: 'inherit' });
const tmp = path.join(path.dirname(kit), tmpName);
fs.copyFileSync(tmp, out);
fs.unlinkSync(tmp);
const hash = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
console.log('输出: ' + out);
console.log('大小: ' + fs.statSync(out).size + ' bytes');
console.log('SHA256: ' + hash);
console.log('后续: 把哈希与 Release 地址登记到 skills/playwright-mcp-setup/VERSIONS.md，提交推送后执行');
console.log('  gh release create playwright-mcp-kit-v<版本> <zip> --title "Playwright MCP Kit <版本> (binaries)"');