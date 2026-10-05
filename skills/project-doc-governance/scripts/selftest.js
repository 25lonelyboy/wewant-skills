#!/usr/bin/env node
/**
 * selftest.js — doc-lint 的回归测试
 *
 * 用法：node selftest.js
 *
 * 覆盖三组：
 *   1. fixtures/repo-broken —— 每类失败各一例，逐个断言被报出
 *   2. fixtures/repo-clean  —— 全绿，退出码 0
 *   3. 临时 git 仓库        —— ④ 的豁免修复：snapshot / ADR 不报漂移，living 报
 *
 * 退出码：0 = 全部通过；1 = 有失败。
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SKILL_ROOT = path.resolve(__dirname, '..');
const LINT = path.join(__dirname, 'doc-lint.js');
const FIXTURES = path.join(SKILL_ROOT, 'fixtures');

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`);
  }
}

function runLint(root, extraArgs = []) {
  const r = spawnSync(process.execPath, [LINT, root, ...extraArgs], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function sh(cmd, cwd, env) {
  return spawnSync(cmd, {
    cwd, shell: true, encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// ---------- 组 1：repo-broken ----------
console.log('\nrepo-broken');
{
  const { code, out } = runLint(path.join(FIXTURES, 'repo-broken'));
  const expect = [
    ['① 孤儿子树缺入口', 'docs/architecture/orphan/ 缺少 README.md 入口'],
    ['① 文件不可达', 'docs/architecture/orphan/note.md 不可达'],
    ['① 未登记目录不可达', 'docs/tasks/2026-02-02-live-thing/README.md 不可达'],
    ['② 带 title 的死链被检出', 'bad-link.md -> missing-target.md 目标不存在'],
    ['③ 缺 frontmatter', 'docs/engineering/no-frontmatter.md 缺少 frontmatter'],
    ['③ status 枚举校验', 'status="liveing" 非法'],
    ['③ last_verified 未来日期', 'last_verified="2099-01-01" 晚于今天'],
    ['④ covers 路径不存在', 'covers 路径不存在：src/nonexistent-module/'],
    ['⑥ 终态痕迹', 'process-traces.md 终态痕迹[修订史/更正记录]：勘误'],
    ['⑦ 反引号假路径', '引用了不存在的路径：src/missing/module.ts'],
    ['⑧ 热区目录未登记进热索引', '2026-02-02-live-thing 在 docs/tasks/ 下但未登记进热索引'],
  ];
  for (const [name, needle] of expect) {
    check(name, out.includes(needle), `未找到 "${needle}"`);
  }
  check('退出码为 1', code === 1, `实际 ${code}`);
  // 反例：scope=process 的活文档不应被要求 covers
  check('scope=process 不要求 covers', !out.includes('governance/rules.md'), '不应报告 rules.md');
  // 反例：热索引以 archive/ 前缀引用归档任务是允许的
  check('archive/ 前缀引用不报违规', !out.includes('2026-01-01-old-thing 被热索引'), '');
  // 反例：规则文本里用反引号列举禁用词，不得被⑥误报
  check('反引号内的禁用词不算痕迹', !out.includes('rules-quoted.md'), '');
  // 反例：非仓库根相对路径（子包内相对路径）不得误报
  check('子包相对路径不误报', !out.includes('electron/main/index.ts'), '子包内路径不应被检查');
}

// ---------- 组 2：repo-clean ----------
console.log('\nrepo-clean');
{
  const { code, out } = runLint(path.join(FIXTURES, 'repo-clean'));
  check('退出码为 0', code === 0, `实际 ${code}\n${out}`);
  check('全绿', out.includes('全绿'), out);
  check('无 FAIL 行', !out.includes('[FAIL]'), out);
}

// ---------- 组 3：④ 豁免（需要 git + 受控提交时间） ----------
console.log('\ndrift 豁免（临时 git 仓库）');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-lint-selftest-'));
  try {
    const w = (p, s) => {
      const full = path.join(dir, p);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, s);
    };
    w('docs/architecture/live.md',
      '---\nstatus: living\ncovers:\n  - src/\nlast_verified: 2026-01-01\n---\n\n# live\n');
    w('docs/architecture/snap.md',
      '---\nstatus: snapshot\ncovers:\n  - src/\nlast_verified: 2026-01-01\n---\n\n# snap\n');
    w('docs/decisions/ADR-001-example.md',
      '---\nstatus: accepted\ncovers:\n  - src/\n---\n\n# ADR-001\n');
    w('src/x.ts', 'export const x = 1;\n');

    sh('git init -q', dir);
    sh('git config user.email t@example.com && git config user.name t', dir);
    // 文档先提交（较早），src 后提交（较晚）→ 覆盖路径晚于文档
    const old = { GIT_AUTHOR_DATE: '2026-01-01T00:00:00', GIT_COMMITTER_DATE: '2026-01-01T00:00:00' };
    const neu = { GIT_AUTHOR_DATE: '2026-01-02T00:00:00', GIT_COMMITTER_DATE: '2026-01-02T00:00:00' };
    sh('git add docs && git commit -q -m docs', dir, old);
    sh('git add src && git commit -q -m src', dir, neu);

    const { out } = runLint(dir);
    check('living 文档报漂移（正例）', out.includes('live.md 疑似陈旧'), out);
    check('snapshot 文档不报漂移', !out.includes('snap.md 疑似陈旧'), out);
    check('ADR 不报漂移', !out.includes('ADR-001-example.md 疑似陈旧'), out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- 汇总 ----------
console.log(`\n${passed} 通过，${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
