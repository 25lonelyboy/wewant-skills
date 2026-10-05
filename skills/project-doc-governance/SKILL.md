---
name: project-doc-governance
description: Use when a repository has messy or boundary-unclear docs/, an oversized or missing AGENTS.md, agents re-reading full documentation on every task, stale docs contradicting code, or when initializing, reorganizing, or converging doc layering, task process docs, and reusable-knowledge distillation rules with progressive disclosure.
---

# 项目文档治理

更新时间：2026-09-03

## 核心原则

建立轻量但可执行的仓库文档知识系统：事实源唯一、过程材料隔离、入口可导航、陈旧可检测。让未来任务先读入口和索引，再按需进入具体主题，避免每次全量读取文档，也避免采信与代码不符的陈旧文档。

## 操作模式判定

开始工作前先判定本次属于哪种模式，只读对应模式的 reference：

| 模式 | 判定条件 | 读取 | 产出 |
|---|---|---|---|
| 初始化 | 仓库无 docs/ 体系或无 AGENTS.md | `references/doc-taxonomy-template.md` | docs 骨架 + 各层 README + AGENTS.md 治理规则 + scripts/doc-lint.js 落仓库并登记 AGENTS.md |
| 重组 | 已有体系但边界混乱、事实散落、孤儿文件多 | `references/doc-taxonomy-template.md` | 归位后的目录树 + 补齐的索引 + scripts/doc-lint.js 落仓库或更新副本并登记 AGENTS.md |
| 沉淀 | 任务产出可复用结论，需写回文档 | `references/official-doc-and-knowledge-policy.md`；大任务加读 `references/task-doc-governance.md` | 事实源更新或任务目录 |
| 只读 | 只需查阅既有知识 | 沿 README 索引按需读取，不加载 reference | 无文件产出 |

## 何时不用本技能

- 单文件或极小仓库，不值得建分层骨架。
- 仓库已有稳定且清晰的文档体系，本次只是小幅内容修改——直接改，别重组。
- 纯代码任务且文档无变更——不要顺手动文档。

## 分层治理

默认使用七类责任边界；如果仓库已有稳定且清晰的体系，保留现有体系并补齐缺口。

- `docs/architecture/`：当前架构事实、边界、基线、不变量、安全约束。
- `docs/engineering/`：可复用工程实践、环境步骤、兼容性结论、验证命令。
- `docs/product/`：业务规则、角色、流程、权限、术语表（`glossary.md`）。
- `docs/operations/`：部署、环境、中间件、观测、CI/CD、运行维护。
- `docs/decisions/`：架构决策记录（ADR），跨域决策的唯一存放地。
- `docs/governance/`：文档体系维护规则、命名规则、路线图、协作边界。
- `docs/tasks/`：大任务、大阶段、专项治理、迁移或调研的过程材料。

创建或重组目录树时，读取 `references/doc-taxonomy-template.md`。制定或评审 ADR 时，读取 `references/adr-governance.md`。

## 命名与新鲜度

- 活文档（事实源）使用稳定语义名，例如 `tenant-model.md`；变更历史交给 git，不靠改名。
- 不可变过程记录使用日期前缀，例如 `2026-08-16-plan.md`、任务目录 `2026-08-16-task-name/`。
- 存量仓库不强制迁移旧文件名；新建文件按本规则执行。
- 活文档用 frontmatter 声明新鲜度：`status`（living/snapshot/deprecated）、`covers`（描述的代码路径）、`last_verified`（最后核对属实的日期）。信任 `last_verified`，不信任编辑时间。
- 行为兜底：文档是索引，代码是事实源；文档结论将影响决策时先核对代码；发现不一致采信代码并修复文档；`deprecated` 文档只作线索，不直接引用结论。

新鲜度三层机制（预防/检测/行为）与豁免范围见 `references/freshness-policy.md`。

## 任务过程文档

大任务、大阶段、专项迁移或跨模块调研在 `docs/tasks/` 下建独立文件夹；小任务的可复用结论直接写入事实源，不建文件夹。

- `docs/tasks/README.md` 是热索引：进行中 + 最近已完成任务，每任务一行。
- 完成超 90 天或结论提升完毕的任务移入 `docs/tasks/archive/` 冷索引。
- 过程文件只追加不改写；收口时把最终结论提升到事实源，稳定决策写成 ADR。
- 读取优先级：事实源 → tasks 热区 → archive（仅显式追溯）。

目录结构、命名、收口与防误读规则见 `references/task-doc-governance.md`。

## 官方文档与 AGENTS.md

涉及版本、平台、供应商建议或不稳定技术决策时，官方文档是默认基线。AGENTS.md 控制在 150 行以内，只放可执行命令、硬规则和导航；禁止写入密钥、token、私有地址；改变已文档化行为的代码变更必须在同一提交内更新文档。

精确规则与经验沉淀条件见 `references/official-doc-and-knowledge-policy.md`。

## 输出要求

- 优先给出可执行的仓库规则，不写散文化说明。
- 明确“读哪里、写哪里、不写哪里”。
- 保持事实源唯一；新建文件前先检查现有主题能否承载；新建后必须登记进所在目录 README 索引。
- 事实文档只写代码中真实存在的行为；未落地的意图只能出现在计划或决策文档中。
- 只读取本次决策需要的 reference，不为完整性而加载全部文档。

## Common Mistakes

| 错误 | 修正 |
|---|---|
| 新文档平铺在 docs/ 根，不进任何索引 | 归位到对应层，并登记进该层 README |
| 用“设计上会……”把未实现的意图写进事实文档 | 意图进 tasks/ 计划文档；事实源只写已验证行为 |
| 以“现有文件太乱”为由绕开事实源新建文件 | 先拆分治理事实源，再归位 |
| 过程笔记写进 architecture/ | 过程材料进 tasks/，收口时只提升结论 |
| 同一事实在多个文档重复维护 | 指定唯一事实源，其余位置只留链接 |
| 靠手工时间戳判断新鲜度 | 用 `last_verified` + git 漂移检测 |
| 验收命令写 `node scripts/doc-lint.js` 却在项目目录找不到脚本 | 脚本母版在技能基目录（加载技能时注入的 Base directory）；仓库副本 `scripts/doc-lint.js` 是初始化/重组的交付物，需登记进 AGENTS.md |

## Red Flags——出现即停

- “先放这里，以后再归位。”→ 现在归位，或说明本次不写的理由。
- “文档按设计意图写，代码没接上也先这样。”→ 事实文档必须与代码一致，差异先修复或明确标注为计划。
- “为了全面了解背景，我把 docs 都读一遍。”→ 沿索引按需读取；入口文件不该要求全量阅读。
- “这份旧文档说得挺详细，先用它的结论。”→ 旧结论先核对代码或查 `last_verified`。
- “跨模块任务顺手记在架构文档里。”→ 建 tasks/ 任务文件夹。

## 本技能不管什么

- 计划怎么写、决策怎么论证、验证怎么执行——交给 writing-plans 等第三方技能；本技能只规定它们的产物放哪（按产物类型：计划→plan.md、决策→decisions.md、验证→verification.md、复盘→retrospective.md，均在任务目录内）。
- 多仓库 / monorepo 的跨仓库文档聚合，超出本技能范围。
- agent 个人记忆不承载仓库事实；docs/ 才是仓库共享事实源，记忆只存偏好与临时上下文。

## 验收

初始化或重组完成后按顺序验收：

1. doc-lint 全绿（孤儿文件、死链、frontmatter、covers 漂移、AGENTS.md 行数）。脚本母版在技能基目录，不在被治理仓库内，双层运行方式：
   - agent 即时验收：`node "<技能基目录>/scripts/doc-lint.js" "<仓库根>"`（尖括号均为占位符，替换为实际路径并保留双引号，防止路径含空格）。技能基目录 = 加载本技能时上下文注入的 `Base directory for this skill` 行给出的路径（本 SKILL.md 即位于该目录内）。
   - 仓库长期自检：初始化/重组必须把母版复制到 `<仓库根>/scripts/doc-lint.js`，并在 AGENTS.md 验证命令区登记 `node scripts/doc-lint.js .`，供 CI/hook 与后续任务原样执行。副本与母版比对：在技能基目录执行 `node "<技能基目录>/scripts/doc-lint.js" --version`，在仓库根执行 `node scripts/doc-lint.js --version`，版本号一致即最新，落后即随重组更新副本。
2. 检索测试：派一个无上下文的 subagent，只给一个真实问题，验证它沿 README 索引在 2–3 次读取内触达目标事实（每多一个信息域约 +1 跳）。
3. 不通过则修索引和归位，重测直到通过。

## 按需引用

- 创建或重组 `docs/` 树：`references/doc-taxonomy-template.md`。
- 制定官方文档查阅、经验沉淀或 AGENTS.md 规则：`references/official-doc-and-knowledge-policy.md`。
- 设计任务目录、过程材料、归档与收口：`references/task-doc-governance.md`。
- 制定或评审架构决策记录：`references/adr-governance.md`。
- 新鲜度预防、检测与行为规则：`references/freshness-policy.md`。
