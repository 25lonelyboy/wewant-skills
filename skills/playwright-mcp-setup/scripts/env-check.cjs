#!/usr/bin/env node
// 用法: node env-check.cjs [kit目录]
// 检查 Playwright MCP + 扩展接入的前置条件，输出逐项 OK/FAIL/INFO 与下一步提示。
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const OFFICIAL_ID = 'mmlmfjhmonkocbjadbfplnigmagldckm';
const kit = path.resolve(process.argv[2] || path.join(os.homedir(), 'playwright-mcp-kit'));
const results = [];
const ok = (name, detail) => results.push(['OK  ', name, detail || '']);
const fail = (name, detail) => results.push(['FAIL', name, detail || '']);
const warn = (name, detail) => results.push(['WARN', name, detail || '']);
const info = (name, detail) => results.push(['INFO', name, detail || '']);

// 0. kit 落位：同步盘占位文件、深路径 MAX_PATH 风险
const syncMarkers = ['onedrive', 'dropbox', 'nutstore', 'seafile', 'icloud', '坚果云'];
const kitLower = kit.toLowerCase();
if (syncMarkers.some(s => kitLower.includes(s))) {
  warn('kit 位于同步盘', '按需占位文件可能导致 node.exe 不在本地、扩展路径随同步失效；移到本地固定磁盘');
}
if (kit.length > 100) {
  warn('kit 路径过深', '当前 ' + kit.length + ' 字符，node_modules 深层文件可能超 Windows MAX_PATH 致解压不全；建议盘符下 3 层内');
}

function nodeVersion(exe) {
  try {
    return execFileSync(exe, ['--version'], { timeout: 15000, windowsHide: true }).toString().trim();
  } catch (e) {
    return null;
  }
}
const majorOf = (v) => parseInt(String(v).replace(/^v/, '').split('.')[0], 10);

// 1. 捆绑 node.exe（默认运行时，启动探测同时暴露策略/杀软拦截）
const bundledNode = path.join(kit, 'node/node.exe');
let bundledVer = null;
if (fs.existsSync(bundledNode)) {
  bundledVer = nodeVersion(bundledNode);
  if (bundledVer && majorOf(bundledVer) >= 20) ok('捆绑 node.exe 可运行', bundledVer + ' @ ' + bundledNode);
  else if (bundledVer) fail('捆绑 node.exe 版本 >= 20', '当前 ' + bundledVer + '，按 VERSIONS.md 更换');
  else fail('捆绑 node.exe 可运行', '启动失败（可能被企业策略/杀软拦截）；回退方案见 troubleshooting.md「Node 运行时场景」');
} else {
  fail('捆绑 node.exe', '缺失 ' + bundledNode + '，按 VERSIONS.md 下载对应架构 node.exe 放入 node/');
}

// 2. 系统 Node 与 nvm（仅报告，默认配置不依赖）
const sysVer = nodeVersion('node');
if (sysVer) info('系统 Node（PATH）', sysVer + (majorOf(sysVer) >= 20 ? '，可作回退运行时' : '，低于 20 不可作回退'));
else info('系统 Node（PATH）', '未找到，使用捆绑 node.exe 即可');
if (process.env.NVM_HOME || process.env.NVM_SYMLINK) {
  info('检测到 nvm-windows', 'NVM_HOME=' + (process.env.NVM_HOME || '') + '；配置必须用捆绑 node 绝对路径，command 写 "node" 会随 nvm use 漂移');
}
if (!bundledVer && sysVer && majorOf(sysVer) >= 20) {
  ok('回退运行时可用', '配置 command 改为 "node"（或 nvm 具体版本绝对路径，如 %APPDATA%/nvm/v22.x.x/node.exe）');
}

// 3. 运行时
const cliPath = path.join(kit, 'runtime/node_modules/@playwright/mcp/cli.js');
if (fs.existsSync(cliPath)) {
  const pkg = JSON.parse(fs.readFileSync(path.join(kit, 'runtime/node_modules/@playwright/mcp/package.json'), 'utf8'));
  ok('@playwright/mcp 运行时', 'v' + pkg.version + ' @ ' + cliPath);
} else {
  fail('@playwright/mcp 运行时', '缺失 ' + cliPath + '，解压 packages/playwright-mcp-*-runtime.zip 到 ' + path.join(kit, 'runtime'));
}

// 4. 扩展产物与官方 ID
const manifestPath = path.join(kit, 'extension/manifest.json');
if (fs.existsSync(manifestPath)) {
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let id = '';
  if (m.key) {
    const hash = crypto.createHash('sha256').update(Buffer.from(m.key, 'base64')).digest();
    id = [...hash.slice(0, 16)].map(b => String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15))).join('');
  }
  if (id === OFFICIAL_ID) ok('扩展 ID 与官方一致', 'v' + m.version + ' @ ' + path.join(kit, 'extension'));
  else fail('扩展 ID 与官方一致', '计算得 ' + (id || '(无 key)') + '，MCP server 按官方 ID 打开连接页，ID 不符将无法连接');
  const sw = path.join(kit, 'extension', m.background && m.background.service_worker || '');
  if (fs.existsSync(sw)) ok('service worker 文件存在', m.background.service_worker);
  else fail('service worker 文件存在', '缺失 ' + sw);
} else {
  fail('扩展产物', '缺失 ' + manifestPath + '，解压 packages/playwright-extension-*-unpacked.zip 到 ' + path.join(kit, 'extension'));
}

// 5. 浏览器 profile 中的扩展安装状态（区分商店版/解包版，检查解包路径漂移）
function extensionInstalled(profileDir) {
  const store = fs.existsSync(path.join(profileDir, 'Extensions', OFFICIAL_ID));
  let rec = null;
  for (const f of ['Preferences', 'Secure Preferences']) {
    try {
      const prefs = JSON.parse(fs.readFileSync(path.join(profileDir, f), 'utf8'));
      const r = prefs && prefs.extensions && prefs.extensions.settings && prefs.extensions.settings[OFFICIAL_ID];
      if (r && typeof r === 'object' && Object.keys(r).length > 0) { rec = r; break; }
    } catch {}
  }
  const unpackedPath = rec && rec.location === 4 && rec.path ? rec.path : null;
  return { installed: store || !!rec, store, unpackedPath };
}

const norm = p => path.resolve(String(p)).toLowerCase();
const kitExt = norm(path.join(kit, 'extension'));
const localAppData = process.env.LOCALAPPDATA || '';
const browsers = [
  ['Chrome', path.join(localAppData, 'Google/Chrome/User Data')],
  ['Edge', path.join(localAppData, 'Microsoft/Edge/User Data')]
];
let anyInstalled = false;
for (const [name, userDataDir] of browsers) {
  if (!fs.existsSync(userDataDir)) { info(name + ' 用户数据目录', '未找到 ' + userDataDir); continue; }
  let profiles = [];
  try {
    const state = JSON.parse(fs.readFileSync(path.join(userDataDir, 'Local State'), 'utf8'));
    profiles = Object.keys(state.profile && state.profile.info_cache || {});
  } catch { profiles = ['Default']; }
  for (const p of profiles) {
    const st = extensionInstalled(path.join(userDataDir, p));
    const label = name + ' profile "' + p + '"';
    if (!st.installed) {
      info(label + ' 未安装扩展', '需在 chrome://extensions 加载 ' + path.join(kit, 'extension'));
      continue;
    }
    anyInstalled = true;
    if (st.store && st.unpackedPath) {
      warn(label + ' 商店版与解包版并存', '同 ID 冲突，chrome://extensions 只保留一个');
    }
    if (st.unpackedPath) {
      if (!fs.existsSync(st.unpackedPath)) {
        warn(label + ' 解包扩展引用路径已不存在', st.unpackedPath + '；kit 被移动过，需在 chrome://extensions 移除后重新加载 ' + path.join(kit, 'extension'));
      } else if (norm(st.unpackedPath) !== kitExt) {
        warn(label + ' 解包扩展引用其他目录', st.unpackedPath + '；与当前 kit 不一致，升级/换 kit 后需重新加载');
      } else {
        ok(label + ' 已安装扩展（解包）', st.unpackedPath);
      }
    } else {
      ok(label + ' 已安装扩展（商店版）', '跳过加载步骤即可');
    }
  }
  const exe = name === 'Chrome'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  if (fs.existsSync(exe)) info(name + ' 可执行文件', exe);
}
if (!anyInstalled) fail('至少一个浏览器 profile 已安装扩展', '人工步骤：浏览器打开 chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择 ' + path.join(kit, 'extension'));

// 输出
console.log('kit 目录: ' + kit);
for (const [s, n, d] of results) console.log(s + ' | ' + n + (d ? ' | ' + d : ''));
const failed = results.filter(r => r[0] === 'FAIL').length;
const warned = results.filter(r => r[0] === 'WARN').length;
if (warned > 0) console.log('WARN 项不阻断，按 references/scenarios.md 对应步骤处理');
console.log(failed === 0 ? 'RESULT: PASS' : 'RESULT: FAIL (' + failed + ' 项)');
process.exit(failed === 0 ? 0 : 1);