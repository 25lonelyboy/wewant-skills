# Changelog

`project-doc-governance` 技能的版本记录。

两个版本号**分开跟踪**，可以不同步：

- **技能包版本**（本文件的条目 + git tag）：技能整体的迭代
- **`doc-lint.js` 的 `VERSION` 常量**：只跟踪脚本本身。它服务于"仓库里的副本是否落后于母版"的比对，所以脚本没变时不应跟着升——否则会给出假的落后信号

## 1.4.0

来源：`wewant-multi-admin` 实跑回执（技能验收通过，同时暴露 5 条技能层问题）。改动集中在"写作层有规则、无检测"这个缺口上。

- **新增内容核验协议**（并入 `references/freshness-policy.md`，不新增 reference）
  - 失效分类表补第三类：**代码事实，但写入时从未核对过**——它不失效，因为从一开始就不成立；漂移检测的是"代码动过没有"，不是"文档对不对"
  - 明确 ④ 的判据边界：④ 绿只说明覆盖代码在文档之后没变过，不担保内容成立
  - 核验协议：分域 → 派无上下文 subagent → 只报可复核的偏差（两侧 file:line 与冲突原文）→ **主 agent 逐条复核后才入清单** → 就地改写
  - 验收补"内容验收"：结构绿 ≠ 内容对；沉淀模式引入新事实断言时需对码核验
- **⑥ 词表扩展**：过程阶段引用（`（P5）`）、过程文档引用（`分设计` / `总 spec` / `设计 D5`）、过程任务编号（`Task 4`）、带日期的事件式教训。JSON 内写明误报最高的形态是"文档自定义分类词表"（`T1–T5` 不是过程引用），阶段标记只匹配 `P+N`
- **⑦ 新增行号检测**：事实源层不得引用 `L123` 这类代码行号
- **⑧ 新增索引精确计数检测**：README 索引行写"已有 7 篇 ADR"→ WARN（口径收窄到"已有/共 + 数量 + 量词"）
- **`templates/final-state-hook/`**：终态守卫的实现与安装脚本，落实"母版单一事实源 + 生成带版本戳的副本"这一设计
- SKILL.md 增加"核验时"这条线与对应模式；验收节补"只认 `--version` 比对、文件级 diff 需 `--strip-trailing-cr`"（母版 CRLF / 下载副本 LF）
- 夹具扩到 30 条断言，含 `T1–T5` 词表、无日期教训叙述、配置字段名三类反例

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
