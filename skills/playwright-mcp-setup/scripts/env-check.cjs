#!/usr/bin/env node
// 用法: node env-check.cjs [kit目录] [--versions <VERSIONS.md>] [--user-data-dir <目录>]...
// 检查 Playwright MCP + 扩展接入的前置条件，输出逐项 OK/WARN/FAIL/INFO 与下一步提示。
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const OFFICIAL_ID = 'mmlmfjhmonkocbjadbfplnigmagldckm';
const results = [];
const ok = (name, detail) => results.push(['OK  ', name, detail || '']);
const fail = (name, detail) => results.push(['FAIL', name, detail || '']);
const warn = (name, detail) => results.push(['WARN', name, detail || '']);
const info = (name, detail) => results.push(['INFO', name, detail || '']);

function parseArgs(argv) {
  const opts = { kit: null, versions: null, userDataDirs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--versions') {
      if (!argv[i + 1]) throw new Error('--versions 缺少路径');
      opts.versions = argv[++i];
    } else if (a === '--user-data-dir') {
      if (!argv[i + 1]) throw new Error('--user-data-dir 缺少目录');
      opts.userDataDirs.push(argv[++i]);
    } else if (a.startsWith('--')) {
      throw new Error('未知参数 ' + a);
    } else if (!opts.kit) {
      opts.kit = a;
    } else {
      throw new Error('多余参数 ' + a);
    }
  }
  opts.kit = path.resolve(opts.kit || path.join(os.homedir(), 'playwright-mcp-kit'));
  return opts;
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const kit = opts.kit;

function readExpectedVersions() {
  const file = opts.versions || path.join(__dirname, '..', 'VERSIONS.md');
  try {
    const text = fs.readFileSync(file, 'utf8');
    const line = text.split(/\r?\n/).find(l => l.includes('env-check 期望值'));
    if (!line) return { file, missing: true };
    const values = {};
    for (const m of line.matchAll(/(mcp|extension|node)=([^\s,，。]+)/g)) values[m[1]] = m[2];
    return { file, values };
  } catch (e) {
    return { file, error: e.message };
  }
}

const expected = readExpectedVersions();
const expectedVersions = expected.values || {};
if (expected.error) info('VERSIONS 期望值', '读取失败 ' + expected.file + '：' + expected.error + '，跳过版本比对');
else if (expected.missing) info('VERSIONS 期望值', '未找到 env-check 期望值 行（' + expected.file + '），跳过版本比对');
else info('VERSIONS 期望值', Object.keys(expectedVersions).map(k => k + '=' + expectedVersions[k]).join(', '));

// 0. kit 落位：同步盘占位文件、深路径 MAX_PATH 风险
const syncMarkers = ['onedrive', 'dropbox', 'nutstore', 'seafile', 'icloud', '坚果云', 'nextcloud', 'synology', '百度网盘', 'baidunetdisk'];
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
  if (bundledVer && majorOf(bundledVer) >= 20) {
    ok('捆绑 node.exe 可运行', bundledVer + ' @ ' + bundledNode);
    if (expectedVersions.node && bundledVer !== expectedVersions.node) {
      warn('捆绑 node.exe 版本与 VERSIONS 一致', '当前 ' + bundledVer + '，VERSIONS 登记 ' + expectedVersions.node + '；确认架构包后更新 VERSIONS');
    } else if (expectedVersions.node) {
      ok('捆绑 node.exe 版本与 VERSIONS 一致', bundledVer);
    }
  } else if (bundledVer) {
    fail('捆绑 node.exe 版本 >= 20', '当前 ' + bundledVer + '，按 VERSIONS.md 更换');
  } else {
    fail('捆绑 node.exe 可运行', '启动失败（可能被企业策略/杀软拦截）；回退方案见 troubleshooting.md「Node 运行时场景」');
  }
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

// 3. 运行时（解析失败按 FAIL 处理，避免半解压包直接抛栈）
const cliPath = path.join(kit, 'runtime/node_modules/@playwright/mcp/cli.js');
const mcpPkgPath = path.join(kit, 'runtime/node_modules/@playwright/mcp/package.json');
let mcpPkg = null;
if (fs.existsSync(cliPath)) {
  try {
    mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
    ok('@playwright/mcp 运行时', 'v' + mcpPkg.version + ' @ ' + cliPath);
  } catch (e) {
    fail('运行时 package.json 可解析', mcpPkgPath + '：' + e.message + '；重新解压 packages/ 下的运行时 zip');
  }
  if (mcpPkg && expectedVersions.mcp) {
    if (mcpPkg.version === expectedVersions.mcp) ok('运行时版本与 VERSIONS 一致', mcpPkg.version);
    else fail('运行时版本与 VERSIONS 一致', '当前 ' + mcpPkg.version + '，VERSIONS 期望 ' + expectedVersions.mcp + '；按 VERSIONS 升级流程整套更换');
  }
} else {
  fail('@playwright/mcp 运行时', '缺失 ' + cliPath + '，解压 packages/playwright-mcp-*-runtime.zip 到 ' + path.join(kit, 'runtime'));
}

// 4. 扩展产物、官方 ID 与版本
const manifestPath = path.join(kit, 'extension/manifest.json');
let kitManifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    kitManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    fail('扩展 manifest.json 可解析', manifestPath + '：' + e.message + '；重新解压 packages/ 下的扩展 zip');
  }
  if (kitManifest) {
    const swName = kitManifest.background && kitManifest.background.service_worker;
    if (typeof swName === 'string' && swName) {
      const sw = path.join(kit, 'extension', swName);
      if (fs.existsSync(sw)) ok('service worker 文件存在', swName);
      else fail('service worker 文件存在', '缺失 ' + sw);
    } else {
      fail('service worker 文件存在', 'manifest 未声明 background.service_worker（需 MV3 离线包）');
    }
    let id = '';
    if (kitManifest.key) {
      const hash = crypto.createHash('sha256').update(Buffer.from(kitManifest.key, 'base64')).digest();
      id = [...hash.slice(0, 16)].map(b => String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15))).join('');
    }
    if (id === OFFICIAL_ID) ok('扩展 ID 与官方一致', 'v' + kitManifest.version + ' @ ' + path.join(kit, 'extension'));
    else fail('扩展 ID 与官方一致', '计算得 ' + (id || '(无 key)') + '，MCP server 按官方 ID 打开连接页，ID 不符将无法连接');
    if (expectedVersions.extension) {
      if (kitManifest.version === expectedVersions.extension) ok('扩展版本与 VERSIONS 一致（kit）', kitManifest.version);
      else fail('扩展版本与 VERSIONS 一致（kit）', '当前 ' + kitManifest.version + '，VERSIONS 期望 ' + expectedVersions.extension + '；按 VERSIONS 升级流程整套更换');
    }
  }
} else {
  fail('扩展产物', '缺失 ' + manifestPath + '，解压 packages/playwright-extension-*-unpacked.zip 到 ' + path.join(kit, 'extension'));
}

// 5. 浏览器 profile 中的扩展安装状态（区分商店版/解包版，检查禁用、残留与版本）
function versionParts(v) {
  return String(v).replace(/^v/, '').replace(/_0$/, '').split('.').map(n => parseInt(n, 10) || 0);
}
function cmpVersion(a, b) {
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return String(a).localeCompare(String(b));
}
function maxVersion(list) {
  return list.slice().sort(cmpVersion).pop();
}
function storeVersion(profileDir) {
  const root = path.join(profileDir, 'Extensions', OFFICIAL_ID);
  let dirs = [];
  try {
    dirs = fs.readdirSync(root).filter(v => {
      if (!/^\d+(\.\d+)*(_\d+)?$/.test(v)) return false;
      try { return fs.statSync(path.join(root, v)).isDirectory(); } catch { return false; }
    });
  } catch { return null; }
  if (!dirs.length) return null;
  const versions = dirs.map(v => {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(root, v, 'manifest.json'), 'utf8'));
      return m.version || v.replace(/_0$/, '');
    } catch {
      return v.replace(/_0$/, '');
    }
  });
  return maxVersion(versions);
}
function extensionInstalled(profileDir) {
  const installedStoreVersion = storeVersion(profileDir);
  let rec = null;
  for (const f of ['Preferences', 'Secure Preferences']) {
    try {
      const prefs = JSON.parse(fs.readFileSync(path.join(profileDir, f), 'utf8'));
      const r = prefs && prefs.extensions && prefs.extensions.settings && prefs.extensions.settings[OFFICIAL_ID];
      if (r && typeof r === 'object' && Object.keys(r).length > 0) { rec = r; break; }
    } catch {}
  }
  const unpackedPath = rec && rec.location === 4 && rec.path ? rec.path : null;
  const installed = !!installedStoreVersion || !!unpackedPath || !!(rec && rec.location !== 4);
  const disableReasons = rec && rec.disable_reasons;
  const disabled = !!rec && (
    rec.state === 0 ||
    (Array.isArray(disableReasons) && disableReasons.length > 0) ||
    (disableReasons && typeof disableReasons === 'object' && Object.keys(disableReasons).length > 0)
  );
  return { installed, store: !!installedStoreVersion, storeVersion: installedStoreVersion, unpackedPath, residual: !!rec && !installed, disabled };
}

function norm(p) {
  const resolved = path.resolve(String(p));
  try {
    return fs.realpathSync.native(resolved).toLowerCase();
  } catch {
    return resolved.toLowerCase();
  }
}
const kitExt = norm(path.join(kit, 'extension'));
const localAppData = process.env.LOCALAPPDATA || '';
const browsers = [];
const seenDirs = new Set();
function addBrowser(name, dir) {
  const key = norm(dir);
  if (seenDirs.has(key)) return;
  seenDirs.add(key);
  browsers.push([name, dir]);
}
addBrowser('Chrome', path.join(localAppData, 'Google/Chrome/User Data'));
addBrowser('Edge', path.join(localAppData, 'Microsoft/Edge/User Data'));
addBrowser('Chromium', path.join(localAppData, 'Chromium/User Data'));
opts.userDataDirs.forEach((d, i) => addBrowser('自定义 user-data-dir #' + (i + 1), path.resolve(d)));

function extensionsUrl(name) {
  return name === 'Edge' ? 'edge://extensions' : 'chrome://extensions';
}

let anyInstalled = false;
for (const [name, userDataDir] of browsers) {
  if (!fs.existsSync(userDataDir)) {
    info(name + ' 用户数据目录', '未找到 ' + userDataDir);
    continue;
  }
  let profiles = [];
  try {
    const state = JSON.parse(fs.readFileSync(path.join(userDataDir, 'Local State'), 'utf8'));
    profiles = Object.keys(state.profile && state.profile.info_cache || {});
  } catch {}
  if (!profiles.length) profiles = ['Default'];
  for (const p of profiles) {
    const profileDir = path.join(userDataDir, p);
    const st = extensionInstalled(profileDir);
    const label = name + ' profile "' + p + '"';
    if (!st.installed) {
      if (st.residual) info(label + ' 无有效安装记录', 'Preferences 中有残留记录但无可执行文件；按第 4 步重新加载扩展');
      else info(label + ' 未安装扩展', '需在 ' + extensionsUrl(name) + ' 加载 ' + path.join(kit, 'extension'));
      continue;
    }
    anyInstalled = true;
    if (st.store && st.unpackedPath) {
      warn(label + ' 商店版与解包版并存', '同 ID 冲突，' + extensionsUrl(name) + ' 只保留一个');
    }
    if (st.disabled) {
      fail(label + ' 扩展已启用', '扩展已安装但被禁用/被策略关闭；在 ' + extensionsUrl(name) + ' 启用后重跑');
    }
    if (st.unpackedPath) {
      const pathExists = fs.existsSync(st.unpackedPath);
      if (!pathExists) {
        warn(label + ' 解包扩展引用路径已不存在', st.unpackedPath + '；kit 被移动过，需在 ' + extensionsUrl(name) + ' 移除后重新加载 ' + path.join(kit, 'extension'));
      } else if (norm(st.unpackedPath) !== kitExt) {
        warn(label + ' 解包扩展引用其他目录', st.unpackedPath + '；与当前 kit 不一致，升级/换 kit 后需重新加载');
      } else {
        ok(label + ' 已安装扩展（解包）', st.unpackedPath);
      }
      if (expectedVersions.extension && pathExists) {
        let installedManifest = null;
        try {
          installedManifest = JSON.parse(fs.readFileSync(path.join(st.unpackedPath, 'manifest.json'), 'utf8'));
        } catch {}
        const v = installedManifest ? installedManifest.version : (kitManifest && kitManifest.version);
        if (!v) warn(label + ' 扩展版本与 VERSIONS 一致', '无法读取已加载扩展的版本，跳过比对');
        else if (v === expectedVersions.extension) ok(label + ' 扩展版本与 VERSIONS 一致', v);
        else fail(label + ' 扩展版本与 VERSIONS 一致', '当前 ' + v + '，VERSIONS 期望 ' + expectedVersions.extension + '；按 VERSIONS 升级流程整套更换');
      }
    } else if (st.store) {
      ok(label + ' 已安装扩展（商店版）', 'v' + (st.storeVersion || '(版本未知)'));
      if (expectedVersions.extension) {
        if (!st.storeVersion) warn(label + ' 扩展版本与 VERSIONS 一致', '商店版版本未知，跳过比对');
        else if (st.storeVersion === expectedVersions.extension) ok(label + ' 扩展版本与 VERSIONS 一致', st.storeVersion);
        else fail(label + ' 扩展版本与 VERSIONS 一致', '当前 ' + st.storeVersion + '，VERSIONS 期望 ' + expectedVersions.extension + '；从商店更新到该版本或改用离线包');
      }
    } else {
      ok(label + ' 已安装扩展（其他位置）', '策略/外部安装，无法读取版本');
      if (expectedVersions.extension) warn(label + ' 扩展版本与 VERSIONS 一致', '该安装位置无法读取版本，跳过比对');
    }
  }
}
if (!anyInstalled) {
  fail('至少一个浏览器 profile 已安装扩展', '人工步骤：Chrome/Chromium 打开 chrome://extensions、Edge 打开 edge://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择 ' + path.join(kit, 'extension'));
}

// 6. 浏览器可执行文件（仅提示标准位置；非标准位置用 --executable-path）
const exeCandidates = {
  Chrome: [
    path.join(localAppData, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  Edge: [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ],
  Chromium: [
    path.join(localAppData, 'Chromium/Application/chrome.exe'),
    'C:/Program Files/Chromium/Application/chrome.exe',
  ],
};
for (const [name, list] of Object.entries(exeCandidates)) {
  const found = list.find(f => fs.existsSync(f));
  if (found) info(name + ' 可执行文件', found);
  else info(name + ' 可执行文件', '未在标准位置找到；需要时用 --executable-path 指定');
}

if (fs.existsSync(path.join(kit, '.output'))) ok('.output 目录', path.join(kit, '.output'));
else info('.output 目录', '缺失；MCP 首次写文件时会创建，或手动创建 ' + path.join(kit, '.output'));

// 输出
console.log('kit 目录: ' + kit);
for (const [s, n, d] of results) console.log(s + ' | ' + n + (d ? ' | ' + d : ''));
const failed = results.filter(r => r[0] === 'FAIL').length;
const warned = results.filter(r => r[0] === 'WARN').length;
if (warned > 0) console.log('WARN 项不阻断，按 references/scenarios.md 对应步骤处理');
console.log(failed === 0
  ? 'RESULT: PASS' + (warned > 0 ? ' (' + warned + ' 项 WARN)' : '')
  : 'RESULT: FAIL (' + failed + ' 项)');
process.exit(failed === 0 ? 0 : 1);
