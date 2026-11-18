#!/usr/bin/env node
// 用法: PLAYWRIGHT_MCP_EXTENSION_TOKEN=<token> node smoke.cjs [kit目录] \
//         [--browser <chrome|msedge>] [--profile-dir-name <name>] \
//         [--executable-path <exe>] [--user-data-dir <dir>]
// 直接以 stdio 驱动 MCP server 跑 navigate/evaluate/snapshot 冒烟，不依赖 MCP 客户端会话。
// token 只从环境变量读取，避免进入命令行参数与进程表。
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function parseArgs(argv) {
  const opts = { kit: null, browser: null, profileDirName: null, executablePath: null, userDataDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      if (!argv[i + 1]) throw new Error(a + ' 缺少值');
      return argv[++i];
    };
    if (a === '--browser') opts.browser = value();
    else if (a === '--profile-dir-name') opts.profileDirName = value();
    else if (a === '--executable-path') opts.executablePath = value();
    else if (a === '--user-data-dir') opts.userDataDir = value();
    else if (a.startsWith('--')) throw new Error('未知参数 ' + a);
    else if (!opts.kit) opts.kit = a;
    else throw new Error('多余参数 ' + a);
  }
  return opts;
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const kit = path.resolve(opts.kit || path.join(os.homedir(), 'playwright-mcp-kit'));
const token = process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN;
if (!token) {
  console.error('缺少环境变量 PLAYWRIGHT_MCP_EXTENSION_TOKEN；token 不要放进命令行参数');
  process.exit(1);
}

const cli = path.join(kit, 'runtime/node_modules/@playwright/mcp/cli.js');
if (!fs.existsSync(cli)) {
  console.error('运行时入口不存在: ' + cli + '；先解压 packages/ 下的运行时 zip');
  process.exit(1);
}

const args = [cli, '--extension', '--output-dir', path.join(kit, '.output')];
if (opts.browser) args.push('--browser', opts.browser);
if (opts.profileDirName) args.push('--profile-dir-name', opts.profileDirName);
if (opts.executablePath) args.push('--executable-path', opts.executablePath);
if (opts.userDataDir) args.push('--user-data-dir', opts.userDataDir);

const child = spawn(process.execPath, args, {
  env: { ...process.env, PLAYWRIGHT_MCP_EXTENSION_TOKEN: token },
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true,
});

let buf = '';
let stderrTail = '';
let finished = false;
const pending = new Map();
let nextId = 1;

function finish(code, message) {
  if (finished) return;
  finished = true;
  if (message) console.error(message);
  for (const { reject } of pending.values()) reject(new Error('MCP server 已退出'));
  pending.clear();
  try { child.kill(); } catch {}
  setTimeout(() => process.exit(code), 150);
}

child.on('error', (e) => finish(1, 'FAIL 无法启动 MCP server: ' + e.message));
child.on('exit', (code, signal) => {
  if (!finished) finish(1, 'FAIL MCP server 提前退出（code=' + code + ' signal=' + signal + '），stderr 尾部: ' + stderrTail);
});
child.stdin.on('error', (e) => finish(1, 'FAIL 写入 MCP server 失败: ' + e.message));
child.stderr.on('data', (d) => { stderrTail = (stderrTail + d.toString()).slice(-2000); });
child.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

function rpc(method, params, timeoutMs) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    if (finished) { reject(new Error('MCP server 已退出')); return; }
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(method + ' 超时(' + timeoutMs + 'ms)，stderr 尾部: ' + stderrTail));
    }, timeoutMs);
    pending.set(id, {
      resolve: (m) => { clearTimeout(timer); resolve(m); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    try {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    } catch (e) {
      clearTimeout(timer);
      pending.delete(id);
      reject(e);
    }
  });
}

function notify(method, params) {
  try {
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  } catch (e) {
    finish(1, 'FAIL 写入 MCP server 失败: ' + e.message);
  }
}

function textOf(m) {
  const r = m.result || {};
  return (r.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('\n');
}

function parseSections(text) {
  const sections = new Map();
  for (const part of text.split(/^### /m).slice(1)) {
    const i = part.indexOf('\n');
    if (i < 0) continue;
    sections.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return sections;
}

function responseError(m, label) {
  if (m.error) return label + ' RPC错误: ' + JSON.stringify(m.error);
  const r = m.result || {};
  if (r.isError) return label + ' 工具错误: ' + textOf(m).slice(0, 800);
  const sections = parseSections(textOf(m));
  if (sections.has('Error')) return label + ' 工具错误: ' + sections.get('Error').slice(0, 800);
  return null;
}

(async () => {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'kit-smoke', version: '1.0' },
  }, 15000);
  if (init.error) throw new Error('initialize 失败: ' + JSON.stringify(init.error));
  console.log('OK initialize |', init.result.serverInfo.name, init.result.serverInfo.version);
  notify('notifications/initialized', {});

  const nav = await rpc('tools/call', { name: 'browser_navigate', arguments: { url: 'about:blank' } }, 90000);
  let err = responseError(nav, 'navigate');
  if (err) throw new Error(err);
  if (!textOf(nav).trim()) throw new Error('navigate 返回空结果');
  console.log('OK browser_navigate about:blank（扩展连接已建立）');

  const ev = await rpc('tools/call', { name: 'browser_evaluate', arguments: { function: '() => 1 + 1' } }, 30000);
  err = responseError(ev, 'evaluate');
  if (err) throw new Error(err);
  const evText = textOf(ev);
  const resultSection = parseSections(evText).get('Result') || '';
  if (!/^\s*2\s*$/m.test(resultSection)) {
    throw new Error('evaluate 未在 Result 段返回 2: ' + (resultSection || evText).slice(0, 400));
  }
  console.log('OK browser_evaluate 1+1 = 2');

  const snap = await rpc('tools/call', { name: 'browser_snapshot', arguments: {} }, 30000);
  err = responseError(snap, 'snapshot');
  if (err) throw new Error(err);
  const snapText = textOf(snap);
  if (!snapText.trim()) throw new Error('snapshot 返回空内容');
  const firstLine = snapText.split('\n').map(s => s.trim()).filter(Boolean).find(l => !l.startsWith('###')) || '(empty)';
  console.log('OK browser_snapshot |', firstLine);

  console.log('RESULT: PASS');
  finish(0);
})().catch((e) => finish(1, 'FAIL ' + e.message));
