#!/usr/bin/env node
/**
 * check-final-state.js — PostToolUse 守卫（Claude Code）
 *
 * 扫描刚写入内容里的终态痕迹，命中就回传警告。
 *
 * 词表来源：同目录的 final-state-rules.json。该文件由 install.sh 从技能母版生成，
 * 带 rules_version 版本戳——hook 运行在项目仓库里，无法跨仓库引用技能目录，
 * 所以用"生成 + 版本戳"而不是直接引用。母版更新后重新跑 install.sh。
 *
 * 设计原则：
 * - 只警告，不阻断（写入已经发生，且规则有误报空间）
 * - 误报是预期的：规则文本里用反引号列举禁用词属正常内容，行内代码会被跳过
 * - 总以退出码 0 结束，绝不让守卫本身打断工具调用
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, 'final-state-rules.json');
const MAX_FOUND = 10;
const PAD = 12;

// 不扫描这些路径：.claude 自身、记忆目录、规则文件自己
const SKIP_PATH = /(\.claude[/\\]|[/\\]memory[/\\]|CLAUDE\.md$|final-state-rules\.json$)/i;

function loadRules() {
  try {
    return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// 清空行内代码与围栏代码块，保留行结构——规则文本用反引号列举禁用词时不会被误报
function stripCode(text) {
  return text
    .replace(/^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1[ \t]*$/gm, '')
    .replace(/``[\s\S]*?``/g, ' ')
    .replace(/`[^`\r\n]*`/g, ' ');
}

function extractTexts(payload) {
  const ti = payload.tool_input || {};
  const out = [];
  for (const key of ['content', 'new_string']) {
    const v = ti[key];
    if (typeof v === 'string' && v) out.push(v);
  }
  return out;
}

function scan(text, rules) {
  const body = stripCode(text);
  const hits = [];
  for (const r of rules) {
    let re;
    try {
      re = new RegExp(r.pattern, (r.flags || '').includes('g') ? r.flags : `${r.flags || ''}g`);
    } catch {
      continue;
    }
    let m;
    while ((m = re.exec(body)) !== null) {
      hits.push([r.label, body.slice(Math.max(0, m.index - PAD), m.index + m[0].length + PAD)
        .replace(/\s+/g, ' ').trim()]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return hits;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }

  const filePath = (payload.tool_input || {}).file_path || '';
  if (filePath && SKIP_PATH.test(filePath)) return 0;

  const ruleSet = loadRules();
  if (!ruleSet || !Array.isArray(ruleSet.rules)) return 0;

  const seen = new Set();
  const lines = [];
  for (const text of extractTexts(payload)) {
    for (const [label, fragment] of scan(text, ruleSet.rules)) {
      const key = `${label}|${fragment}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- [${label}] …${fragment}…`);
      if (lines.length >= MAX_FOUND) break;
    }
  }
  if (lines.length === 0) return 0;

  const message =
    `【终态自查】刚写入的内容里发现过程痕迹（词表 ${ruleSet.rules_version}，` +
    `规则见 agent 入口文件的文档治理一节）：\n${lines.join('\n')}\n` +
    '若确认属于「修订史／自我更正／删除内容／防御式声明／过程阶段引用」，' +
    '删掉后再交付；若属被描述对象本身的客观事实（如标准的版本沿革），忽略本警告。';

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message },
  }));
  return 0;
}

process.exit(main());
