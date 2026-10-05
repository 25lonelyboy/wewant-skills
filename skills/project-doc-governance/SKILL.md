---
name: project-doc-governance
description: Use when a repository has messy or boundary-unclear docs/, an oversized or missing AGENTS.md, agents re-reading full documentation on every task, stale docs contradicting code, or when initializing, reorganizing, or converging doc layering, task process docs, and reusable-knowledge distillation rules with progressive disclosure.
---

# 项目文档治理

## 核心原则

> 每一条内容都要挣得它的位置：不重复、不过期、不留过程。

组织方式（分层、索引、frontmatter）是手段。技能覆盖三条线：

- **仓库态**：已有文档长什么样——分层、索引、可达性（doc-lint 九项检查）。
- **写入时**：正要写的这段该不该写、算什么（`doc-writing-and-curation.md`）。
- **核验时**：已经写下的内容对不对（`freshness-policy.md` 的「内容核验」）。

前两条保证结构对、以后不写错；**只有第三条能发现"已经写错了"**。

## 操作模式判定

| 模式 | 判定条件 | 读取 | 产出 |
|---|---|---|---|
| 初始化 | 仓库无 docs/ 体系或无 agent 入口文件 | doc-taxonomy-template | docs 骨架 + 各层 README + 入口规则 + doc-lint 落仓库 |
| 重组 | 已有体系但边界混乱、不可达文件多 | doc-taxonomy-template | 归位后的目录树 + 补齐索引 + doc-lint 更新 |
| 沉淀 | 任务产出可复用结论，需写回文档 | doc-writing-and-curation；大任务加读 task-doc-governance | 事实源改写或任务目录 |
| 核验 | 需确认已写下的内容是否成立 | freshness-policy 的「内容核验」 | 偏差清单 + 就地改写 |
| 只读 | 只需查阅既有知识 | 沿 README 索引按需读取 | 无文件产出 |

各模式的验收见「验收」一节。**只跑 doc-lint 就宣布通过是假绿**——它只验结构。

## 何时不用本技能

- 单文件或极小仓库，不值得建分层骨架。
- 仓库已有稳定且清晰的文档体系，本次只是小幅内容修改——直接改，别重组。
- 纯代码任务且文档无变更——不要顺手动文档。

## 分层治理

默认七类责任边界；仓库已有稳定体系时保留它并补齐缺口。

- `docs/architecture/`：当前架构事实、边界、基线、不变量、安全约束。
- `docs/engineering/`：可复用工程实践、环境步骤、兼容性结论、验证命令。
- `docs/product/`：业务规则、角色、流程、权限、术语表（`glossary.md`）。
- `docs/operations/`：部署、环境、中间件、观测、CI/CD、运行维护。
- `docs/decisions/`：架构决策记录（ADR），跨域决策的唯一存放地。
- `docs/governance/`：文档体系维护规则、命名规则、路线图、协作边界。
- `docs/tasks/`：大任务、大阶段、专项治理、迁移或调研的过程材料。

目录树、单文档结构、索引规则见 `references/doc-taxonomy-template.md`；ADR 见 `references/adr-governance.md`。

## 命名与新鲜度

- 活文档用稳定语义名（`tenant-model.md`）；不可变过程记录用日期前缀（`2026-08-16-plan.md`）。存量旧命名不强制迁移。
- 活文档 frontmatter：`status`（living/snapshot/deprecated）、`scope`（code/process）、`covers`、`last_verified`。信任 `last_verified`，不信任编辑时间。
- **作废的文档默认删除**，历史交给 git；仅当能指出具体读者或场景时才保留墓碑。ADR 的 Superseded 是例外。
- 兜底：文档是索引，代码是事实源；结论影响决策时先核对代码。

三层失效机制、`scope` 语义、外部事实的来源要求、内容核验协议见 `references/freshness-policy.md`。

## 任务过程文档

大任务在 `docs/tasks/` 下建独立文件夹；小任务的可复用结论直接写入事实源。

- `docs/tasks/README.md` 是热索引（进行中 + 最近已完成，每任务一行）；完成超 90 天或结论提升完毕移入 `archive/`。
- 过程文件只追加不改写；**事实源文档正相反——改写，只保留与当前事实匹配的内容**。
- 收口时把结论提升到事实源、稳定决策写成 ADR；读取优先级：事实源 → tasks 热区 → archive（仅显式追溯）。

见 `references/task-doc-governance.md`。

## 官方文档与 agent 入口文件

涉及版本、平台、供应商建议时，官方文档是默认基线；**外部断言必须带来源与访问日期**。agent 入口文件（`AGENTS.md`，或既有的 `CLAUDE.md`）≤150 行，只放可执行命令、硬规则和导航；禁止写入密钥、token、私有地址；改变已文档化行为的代码变更必须在同一提交内更新文档。两个入口文件并存时指定一个为正本，另一个只放一行指针。

见 `references/official-doc-and-knowledge-policy.md`；规则块见 `templates/agents-doc-governance-block.md`。

## 输出要求

- **沉默不允许**：每条实质断言要么带来源，要么带标注。裸断言视为违规——它让核实过的内容和编造的内容完全同形。
- 优先给出可执行的仓库规则，不写散文化说明；明确"读哪里、写哪里、不写哪里"。
- 事实源唯一；新建前先检查现有主题能否承载；新建后必须登记进所在目录 README 索引。
- 事实文档只写代码中真实存在的行为；未落地的意图只进计划或决策文档。
- 只读本次决策需要的 reference。

## Common Mistakes

| 错误 | 修正 |
|---|---|
| 新文档平铺在 docs/ 根，不进任何索引 | 归位到对应层，并登记进该层 README |
| 用"设计上会……"把未实现的意图写进事实文档 | 意图进 tasks/ 计划文档 |
| 以"现有文件太乱"为由绕开事实源新建文件 | 先拆分治理事实源，再归位 |
| 过程笔记写进 architecture/ | 过程材料进 tasks/，收口时只提升结论 |
| 同一事实在多个文档重复维护 | 指定唯一事实源，其余只留链接 |
| 往事实源里追加"本次变更"一节 | 事实源是改写式的：改正文，作废内容直接删 |
| 索引行写精确计数（"已有 7 篇 ADR"） | 只写定性结论；数字必然腐烂且无检测手段 |
| 引用代码用行号 | 用符号名；行号会被任何一次无关编辑作废 |
| 文档里留过程阶段标记（`（P5）`、`设计 D5`、`Task 4`） | 那是任务内上下文，读者无法解析；写自足的事实 |
| 靠手工时间戳判断新鲜度 | 用 `last_verified` + 漂移检测 |
| 验收命令写 `node scripts/doc-lint.js` 却在项目目录找不到脚本 | 副本是初始化/重组的交付物，须落仓库并登记入口文件。**ESM 仓库（根 package.json 有 `"type": "module"`）副本必须叫 `doc-lint.cjs`** |

## Red Flags——出现即停

- "先放这里，以后再归位。"→ 现在归位，或说明本次不写的理由。
- "文档按设计意图写，代码没接上也先这样。"→ 事实文档必须与代码一致。
- "为了全面了解背景，我把 docs 都读一遍。"→ 沿索引按需读取。
- "这份旧文档说得挺详细，先用它的结论。"→ 先核对代码或查 `last_verified`。
- "跨模块任务顺手记在架构文档里。"→ 建 tasks/ 任务文件夹。
- "doc-lint 全绿了，文档没问题。"→ 绿的是结构，不是内容。见「验收」第 3、4 条。

## 本技能不管什么

- 计划怎么写、决策怎么论证、验证怎么执行——交给 writing-plans 等第三方技能；本技能只规定它们的产物放哪（计划→plan.md、决策→decisions.md、验证→verification.md、复盘→retrospective.md，均在任务目录内）。
- 多仓库 / monorepo 的跨仓库文档聚合。
- agent 个人记忆不承载仓库事实；docs/ 才是共享事实源。

## 验收

**结构验收**（初始化 / 重组后必做）：

1. doc-lint 全绿。脚本需 Node ≥ 18；无 Node 时按 `templates/manual-checklist.md` 人工过。脚本母版在技能安装目录（加载本技能时上下文给出的 `Base directory for this skill`）：
   - 即时验收：`node "<技能安装目录>/scripts/doc-lint.js" "<仓库根>"`
   - 仓库自检：复制母版到 `<仓库根>/scripts/`（ESM 仓库用 `.cjs`）并在入口文件登记命令。副本与母版比对**只认 `--version` 输出的版本号**——两侧文件可能仅行尾符不同（母版 CRLF / 下载副本 LF），文件级 diff 需加 `--strip-trailing-cr`，否则会误报"副本落后"。
   - 九项检查：① 可达性 ② 死链 ③ frontmatter 与字段值 ④ covers 漂移与路径 ⑤ 入口文件行数 ⑥ 终态痕迹 ⑦ 引用与定位符 ⑧ 索引一致性 ⑨ 活文档体积基线。
2. 检索测试：派一个无上下文的 subagent，只给一个真实问题，要求它**回报读取路径**，验证沿索引 2–3 跳触达目标事实。

**内容验收**（沉淀 / 核验模式，以及任何"结论将影响决策"的场合）：

3. 本次引入的新事实断言已对码核验；或已按 `freshness-policy.md` 的「内容核验」协议跑完一轮并逐条处置。
4. **结构绿 ≠ 内容对。** 只做第 1、2 步就宣布通过是假绿——漂移检测问的是"代码动过没有"，不是"文档对不对"。

其他 harness 上"技能安装目录"的取法不同；本技能正文不依赖具体工具名。

## 按需引用

- 创建/重组 `docs/` 树、单文档结构、索引规则：`references/doc-taxonomy-template.md`
- **写回文档时的取舍、更新方式、溯源与标注**：`references/doc-writing-and-curation.md`
- **内容核验协议、失效分类、`scope` 语义**：`references/freshness-policy.md`
- 任务目录、过程材料、归档与收口：`references/task-doc-governance.md`
- 架构决策记录：`references/adr-governance.md`
- 官方文档查阅、沉淀判据、入口文件政策：`references/official-doc-and-knowledge-policy.md`

## 维护本技能

- 版本用 git tag；改动记仓库根 `CHANGELOG.md`（本文件有 150 行预算）。`doc-lint.js` 的 `VERSION` 只跟踪脚本本身，脚本没变时不跟着升。
- 改了 `description` 字段（触发入口，等同 API）时同步更新 `agents/openai.yaml`。
- 改了 `scripts/final-state-rules.json` 后，重新生成项目 hook 侧的副本（doc-lint 会校验 `rules_version`）。
- 改脚本或检查项后，在技能仓库根跑 `node dev/selftest.js` 回归（夹具在 `dev/fixtures/`，不随技能分发）。夹具继承编写者的盲点，**同时要拿真实仓库抽查**。
