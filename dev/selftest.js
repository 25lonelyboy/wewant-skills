#!/usr/bin/env node
/**
 * selftest.js — doc-lint 的回归测试
 *
 * 用法：node dev/selftest.js
 *
 * 开发期工具，**不进分发**：技能分发给各 agent 的是
 * `skills/project-doc-governance/` 子树，本文件与 fixtures/ 在仓库根的 dev/ 下。
 *
 * 覆盖三组：
 *   1. fixtures/repo-broken —— 每类失败各一例，逐个断言被报出
 *   2. fixtures/repo-clean  —— 全绿，退出码 0
 *   3. 临时 git 仓库        —— ④ 的豁免修复：snapshot / ADR 不报漂移，living 报
 *
 * 夹具的边界：夹具是"已知该怎么报"的断言，能防回归；但它由写检查项的人编写，
 * 因此继承同一套盲点。真实仓库（如大型 monorepo）才能暴露设计层面的误报——
 * 两者都要跑。
 *
 * 退出码：0 = 全部通过；1 = 有失败。
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SKILL_ROOT = path.resolve(__dirname, '../skills/project-doc-governance');
const LINT = path.join(SKILL_ROOT, 'scripts', 'doc-lint.js');
const FIXTURES = path.join(__dirname, 'fixtures');

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
    ['⑥ 过程阶段引用', 'process-refs.md 终态痕迹[过程阶段引用]：（P5）'],
    ['⑥ 过程文档引用', 'process-refs.md 终态痕迹[过程文档引用]：分设计'],
    ['⑥ 事件式教训（带日期）', 'process-refs.md 终态痕迹[事件式教训叙述]：教训（2026-'],
    ['⑦ 反引号假路径', '引用了不存在的路径：src/missing/module.ts'],
    ['⑦ 代码行号', 'process-refs.md 引用了代码行号：L109'],
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
  // 反例：文档自定义的分类词表（T1–T5）不是过程引用
  check('T1–T5 分类词表不误报', !out.includes('T1 ') && !out.includes('（T1）'), '');
  // 反例：不带日期的"历史教训（…）"是对规则的解释，保留
  check('无日期的教训叙述不误报', !out.includes('pre hook 时代'), '');
  // 反例：真实配置字段名、当前阈值事实不得误报
  check('配置字段名与阈值事实不误报', !out.includes('exactOptionalPropertyTypes'), '');
  // ⑧ 索引行精确计数（WARN 级）
  check('⑧ 报出索引精确计数', out.includes('索引行写了精确计数'), '');
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
