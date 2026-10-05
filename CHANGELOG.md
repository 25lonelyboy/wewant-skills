# Changelog

`project-doc-governance` 技能的版本记录。

两个版本号**分开跟踪**，可以不同步：

- **技能包版本**（本文件的条目 + git tag）：技能整体的迭代
- **`doc-lint.js` 的 `VERSION` 常量**：只跟踪脚本本身。它服务于"仓库里的副本是否落后于母版"的比对，所以脚本没变时不应跟着升——否则会给出假的落后信号

## 1.3.1

- 回归夹具与 `selftest.js` 移到仓库根的 `dev/`：它们只服务"维护技能的人"，不应随技能分发到各 agent（`doc-lint.js` 未变，脚本版本仍为 1.3.0）
- 技能分发范围明确为 `skills/<技能名>/` 子树，`README.md` 写明分发边界

## 1.3.0

- 新增 `references/doc-writing-and-curation.md`：段落级取舍判据、事实源改写 vs 过程追加、单文档结构、溯源与标注（沉默不允许）
- `doc-lint` 新增检查项 ⑥ 终态痕迹、⑦ 悬空引用
- 终态词表抽出为 `scripts/final-state-rules.json`，作为 doc-lint 与项目级 hook 的单一事实源
- ⑦ 的路径检查限定"仓库顶层目录开头"，避免 monorepo 子包相对路径全线误报
- 新增 `templates/`：pre-commit、CI job、入口文件规则块、人工检查表、agent 目录链接与同步脚本
- `SKILL.md` 增加"仓库态 / 写入时"两条线的说明与「沉默不允许」原则；「技能基目录」改为 harness 中立的"技能安装目录"

## 1.2.0

- 漂移检测按 `status` 豁免 snapshot / deprecated / ADR；新增 `scope: code | process`，让无对应代码路径的活文档有合法形态
- `covers` 路径存在性检查不再依赖 git
- `status` 枚举与 `last_verified` 格式、未来日期校验
- 死链正则容纳带 title 的链接
- ① 由"同目录 basename 是否被提及"改为从 `docs/README.md` 出发的可达性 BFS
- 新增 ⑧ tasks 索引一致性、⑨ 活文档体积基线（仅 WARN）
- 新增 `--ignore` / `--max-doc-lines` / `--hot-index-rows`
- 新增夹具 `repo-broken` / `repo-clean` 与 `selftest.js`
- references 修订：deprecated 默认删除、外部事实的来源要求、索引行不写精确计数、活文档不随任务归档；删掉各文件的「更新时间」头

## 1.1.0

- `doc-lint.js` 引入 `VERSION` 常量与 `--version`，支持仓库副本与母版的版本比对
- 五项检查：孤儿文件、死链、frontmatter、covers 漂移、AGENTS.md 行数
- 五个 references：分类模板、任务过程文档、ADR、官方文档与沉淀、新鲜度策略
- `agents/openai.yaml`：OpenAI/Codex 侧入口
