#!/usr/bin/env node
// 用法: node smoke.cjs <kit目录> <token> [浏览器exe路径]
// 直接以 stdio 驱动 MCP server 跑 navigate/evaluate/snapshot 冒烟，不依赖 MCP 客户端会话。
const { spawn } = require('child_process');
const path = require('path');

const kit = path.resolve(process.argv[2] || 'D:/WorkSpace/02Tools/playwright-mcp-kit');
const token = process.argv[3] || process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN;
const exe = process.argv[4];
if (!token) { console.error('缺少 token 参数'); process.exit(1); }

const cli = path.join(kit, 'runtime/node_modules/@playwright/mcp/cli.js');
const args = [cli, '--extension'];
if (exe) args.push('--executable-path', exe);
const child = spawn(process.execPath, args, {
  env: { ...process.env, PLAYWRIGHT_MCP_EXTENSION_TOKEN: token },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buf = '';
const pending = new Map();
let nextId = 1;
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
let stderrTail = '';
child.stderr.on('data', (d) => { stderrTail = (stderrTail + d.toString()).slice(-2000); });

function rpc(method, params, timeoutMs) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(method + ' 超时(' + timeoutMs + 'ms)，stderr 尾部: ' + stderrTail));
    }, timeoutMs);
    pending.set(id, { resolve: (m) => { clearTimeout(timer); resolve(m); } });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
const textOf = (m) => {
  if (m.error) return 'RPC错误: ' + JSON.stringify(m.error);
  const r = m.result || {};
  if (r.isError) return '工具错误: ' + (r.content || []).map(c => c.text || '').join('\n');
  return (r.content || []).map(c => c.text || '').join('\n');
};

(async () => {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'kit-smoke', version: '1.0' }
  }, 15000);
  if (init.error) throw new Error('initialize 失败: ' + JSON.stringify(init.error));
  console.log('OK initialize |', init.result.serverInfo.name, init.result.serverInfo.version);
  notify('notifications/initialized', {});

  const nav = await rpc('tools/call', { name: 'browser_navigate', arguments: { url: 'about:blank' } }, 90000);
  const navText = textOf(nav);
  if (/错误|error/i.test(navText) && !/### Ran Playwright code/.test(navText)) throw new Error('navigate 失败: ' + navText.slice(0, 800));
  console.log('OK browser_navigate about:blank（扩展连接已建立）');

  const ev = await rpc('tools/call', { name: 'browser_evaluate', arguments: { function: '() => 1 + 1' } }, 30000);
  const evText = textOf(ev);
  if (!/\b2\b/.test(evText)) throw new Error('evaluate 未返回 2: ' + evText.slice(0, 400));
  console.log('OK browser_evaluate 1+1 = 2');

  const snap = await rpc('tools/call', { name: 'browser_snapshot', arguments: {} }, 30000);
  const snapText = textOf(snap);
  if (snapText.startsWith('工具错误') || snapText.startsWith('RPC错误')) throw new Error('snapshot 失败: ' + snapText.slice(0, 400));
  console.log('OK browser_snapshot |', snapText.split('\n')[0]);

  console.log('RESULT: PASS');
  child.kill();
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e.message);
  child.kill();
  process.exit(1);
});