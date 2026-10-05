# Changelog

本仓库的版本记录。技能包版本与 `doc-lint.js` 内的 `VERSION` 常量同步；仓库侧用 git tag 标记。

## 1.1.0

- `doc-lint.js` 引入 `VERSION` 常量与 `--version`，支持仓库副本与母版的版本比对
- 五项检查：孤儿文件、死链、frontmatter、covers 漂移、AGENTS.md 行数
- 五个 references：分类模板、任务过程文档、ADR、官方文档与沉淀、新鲜度策略
- `agents/openai.yaml`：OpenAI/Codex 侧入口
