#!/usr/bin/env node
// 用法: node dev/build-kit-release.cjs <kit目录> [输出zip] [--force]
// 从本地 kit 组装 node/ + packages/ 为 binaries zip，校验版本与包名，输出 SHA256，供挂 GitHub Release。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const USAGE = '用法: node dev/build-kit-release.cjs <kit目录> [输出zip] [--force]';

function die(message) {
  console.error(message);
  process.exit(1);
}

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function readExpectedVersions() {
  const file = path.join(__dirname, '..', 'skills', 'playwright-mcp-setup', 'VERSIONS.md');
  try {
    const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(l => l.includes('env-check 期望值'));
    if (!line) return { file };
    const values = {};
    for (const m of line.matchAll(/(mcp|extension|node)=([^\s,，。]+)/g)) values[m[1]] = m[2];
    return { file, values };
  } catch (e) {
    return { file, error: e.message };
  }
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const positional = args.filter(a => a !== '--force');
if (!positional[0]) die(USAGE);
const kit = path.resolve(positional[0]);
if (!fs.existsSync(kit)) die('kit 目录不存在: ' + kit);

const kitName = path.basename(kit);
if (!kitName) die('kit 不能是盘符/根目录，tar 需要明确的目录名: ' + kit);
const nodeExe = path.join(kit, 'node', 'node.exe');
const packagesDir = path.join(kit, 'packages');
for (const required of [nodeExe, packagesDir]) {
  if (!fs.existsSync(required)) die('缺失 ' + required);
}

// 1. 离线包必须恰为约定的两个，版本从文件名读取
const zips = fs.readdirSync(packagesDir).filter(f => f.endsWith('.zip'));
const runtimeMatches = zips.map(f => f.match(/^playwright-mcp-(.+)-runtime\.zip$/)).filter(Boolean);
const extensionMatches = zips.map(f => f.match(/^playwright-extension-(.+)-unpacked\.zip$/)).filter(Boolean);
if (zips.length !== 2 || runtimeMatches.length !== 1 || extensionMatches.length !== 1) {
  die('packages/ 应恰含一个 playwright-mcp-<版本>-runtime.zip 与一个 playwright-extension-<版本>-unpacked.zip，当前：' + (zips.join(', ') || '(空)'));
}
const runtimeZip = runtimeMatches[0][0];
const extensionZip = extensionMatches[0][0];
const mcpVersion = runtimeMatches[0][1];
const extensionVersion = extensionMatches[0][1];
if (fs.statSync(path.join(packagesDir, runtimeZip)).size === 0 || fs.statSync(path.join(packagesDir, extensionZip)).size === 0) {
  die('packages/ 中的 zip 不能为空');
}

// 2. 若 kit 内已有解压产物，交叉校验版本
const runtimePkgPath = path.join(kit, 'runtime', 'node_modules', '@playwright', 'mcp', 'package.json');
if (fs.existsSync(runtimePkgPath)) {
  try {
    const v = JSON.parse(fs.readFileSync(runtimePkgPath, 'utf8')).version;
    if (v !== mcpVersion) die('runtime/ 版本 ' + v + ' 与 ' + runtimeZip + ' 不一致');
  } catch (e) {
    die('runtime/package.json 解析失败: ' + e.message);
  }
}
const manifestPath = path.join(kit, 'extension', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const v = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version;
    if (v !== extensionVersion) die('extension/ 版本 ' + v + ' 与 ' + extensionZip + ' 不一致');
  } catch (e) {
    die('extension/manifest.json 解析失败: ' + e.message);
  }
}

// 3. VERSIONS 期望值必须与 kit 一致，避免产出与登记/tag 漂移的资产
const expected = readExpectedVersions();
if (expected.error) console.warn('[WARN] 读取 VERSIONS 失败：' + expected.error + '，跳过版本登记校验');
if (expected.values) {
  if (expected.values.mcp && expected.values.mcp !== mcpVersion) {
    die('VERSIONS 登记 mcp=' + expected.values.mcp + '，kit 为 ' + mcpVersion + '；先更新 VERSIONS.md');
  }
  if (expected.values.extension && expected.values.extension !== extensionVersion) {
    die('VERSIONS 登记 extension=' + expected.values.extension + '，kit 为 ' + extensionVersion + '；先更新 VERSIONS.md');
  }
}

// 4. 捆绑 node.exe 必须可运行；版本与 VERSIONS 不一致仅提示（允许按架构换包）
let nodeVersion = null;
try {
  nodeVersion = execFileSync(nodeExe, ['--version'], { timeout: 15000, windowsHide: true }).toString().trim();
} catch (e) {
  die('node/node.exe 无法运行: ' + e.message);
}
if (expected.values && expected.values.node && nodeVersion !== expected.values.node) {
  console.warn('[WARN] VERSIONS 登记 node=' + expected.values.node + '，kit 为 ' + nodeVersion);
}

// 5. 输出名必须与版本一致；默认名直接可发布
const expectedName = 'playwright-mcp-kit-' + mcpVersion + '-binaries.zip';
const out = path.resolve(positional[1] || expectedName);
if (path.basename(out) !== expectedName) {
  die('输出文件名必须为 ' + expectedName + '（与 VERSIONS/tag 保持一致），当前 ' + path.basename(out));
}
if (!fs.existsSync(path.dirname(out))) die('输出目录不存在: ' + path.dirname(out));
if (fs.existsSync(out) && !force) die('输出已存在，加 --force 覆盖: ' + out);

// 6. 先打包到临时文件并校验内容，再落盘；失败不破坏已有产物
const tmpName = '.kit-binaries-' + process.pid + '-' + Date.now() + '.zip';
const tmp = path.join(path.dirname(kit), tmpName);
let buildError = null;
try {
  try {
    execFileSync('tar', ['-a', '-cf', tmpName, '-C', kitName, 'node', 'packages'], { cwd: path.dirname(kit), stdio: 'inherit' });
  } catch (e) {
    throw new Error('tar 打包失败: ' + e.message);
  }
  if (!fs.existsSync(tmp) || fs.statSync(tmp).size === 0) throw new Error('tar 未产出有效文件');
  let listing = '';
  try {
    listing = execFileSync('tar', ['-tf', tmpName], { cwd: path.dirname(tmp), encoding: 'utf8' });
  } catch (e) {
    throw new Error('产物校验失败（无法读取 zip 列表）: ' + e.message);
  }
  for (const need of ['node/node.exe', runtimeZip, extensionZip]) {
    if (!listing.includes(need)) throw new Error('产物缺少 ' + need);
  }
  fs.copyFileSync(tmp, out);
} catch (e) {
  buildError = e.message;
} finally {
  try { fs.unlinkSync(tmp); } catch {}
}
if (buildError) die(buildError);

(async () => {
  const size = fs.statSync(out).size;
  const hash = await hashFile(out);
  console.log('输出: ' + out);
  console.log('大小: ' + size + ' bytes');
  console.log('SHA256: ' + hash);
  console.log('组件哈希（登记到 VERSIONS.md）：');
  for (const file of [nodeExe, path.join(packagesDir, runtimeZip), path.join(packagesDir, extensionZip)]) {
    console.log('  ' + (await hashFile(file)) + '  ' + path.relative(kit, file).replace(/\\/g, '/'));
  }
  console.log('后续: 把哈希与 Release 地址登记到 skills/playwright-mcp-setup/VERSIONS.md，提交推送后执行');
  console.log('  gh release create playwright-mcp-kit-v' + mcpVersion + ' ' + path.basename(out) + ' --title "Playwright MCP Kit ' + mcpVersion + ' (binaries)"');
})().catch((e) => die('计算哈希失败: ' + e.message));
