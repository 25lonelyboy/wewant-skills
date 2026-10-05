# 文档分类模板

更新时间：2026-09-03

当仓库需要初始化 `docs/` 骨架，或现有文档边界混乱需要重组时，读取本文件。

## 入口文件分工

- 根 `README.md`：给**人**读。项目定位、快速开始、目录导航。
- 根 `AGENTS.md`：给 **agent** 读。可执行命令、硬规则、文档导航，≤150 行。
- `docs/README.md`：文档体系总索引。读取顺序、各层职责、维护规则。

三者不互相复述事实；同一事实只在一个文件维护，其余位置放链接。

## 推荐读取顺序

1. `AGENTS.md`（agent 任务）或 `README.md`（人类上手）
2. `docs/README.md`
3. 与任务相关的领域入口，例如 `docs/architecture/README.md`
4. 领域下的最小主题文件
5. 仅当事实源无答案时，进入 `docs/tasks/` 热区；仅显式追溯时进入 archive

## 默认目录树

```text
docs/
  README.md
  architecture/
    README.md
  engineering/
    README.md
  product/
    README.md
    glossary.md
  operations/
    README.md
  decisions/
    README.md
  governance/
    README.md
  tasks/
    README.md
    archive/
      README.md
```

只为已有真实内容的领域建目录；`product/`、`operations/` 可在有内容时再建。

## 职责边界

- `docs/README.md`
  - 用途：导航、读取顺序、维护规则、主要目录索引。
  - 避免：详细架构事实、一次性任务记录、完整排查过程。

- `docs/architecture/`
  - 适合：系统边界、技术基线、分层结构、不变量、租户模型、信任模型、硬约束。
  - 避免：重复工程命令、迁移日记、临时任务笔记。

- `docs/engineering/`
  - 适合：目录放置规则、已验证启动流程、依赖兼容性、构建与验证命令。
  - 避免：重新定义已由 `architecture/` 维护的架构事实。

- `docs/product/`
  - 适合：角色、流程、权限、业务约束、模块行为；`glossary.md` 是业务术语唯一事实源。
  - 避免：实现细节和基础设施决策。

- `docs/operations/`
  - 适合：环境、CI/CD、中间件、监控、备份、部署拓扑。
  - 避免：能力尚不存在时提前写大量猜测性文档。

- `docs/decisions/`
  - 适合：ADR 唯一存放地。不可逆、影响模块边界或含真实权衡的决策。
  - 避免：琐碎实现细节、可随时回退的小决定。规则见 `adr-governance.md`。

- `docs/governance/`
  - 适合：文档体系维护规则、命名规范、职责边界、路线图。
  - 避免：存放实时架构事实。

- `docs/tasks/`
  - 适合：大任务、大阶段、专项迁移、调研的过程材料；热索引 + archive 冷索引。
  - 避免：把临时过程结论直接当成稳定架构事实。

## 命名规则

- 活文档（事实源）：稳定语义名，`tenant-model.md`、`build-commands.md`；历史靠 git，不靠改名。
- 过程记录与决策快照：日期前缀，`2026-08-16-research.md`。
- 任务目录：`2026-08-16-task-name/`；目录内过程文件同样日期前缀。
- `README.md` 固定作为目录入口。
- 存量旧命名不强制迁移；新文件按本规则执行。

## 图表约定

- Mermaid 内联优先：图即代码，可 diff、可评审。
- 图片资源放与文档同名的 `assets/` 子目录，例如 `tenant-model.md` 配图放 `architecture/assets/tenant-model/`。

## 渐进式披露规则

- 每层 `README.md` 先回答“这里负责什么、下一步读哪里”。
- 入口文件只保留索引和摘要，不承载完整历史。
- 长主题拆成多个职责清晰的文件；无法拆分时，在顶部提供目录和“何时读取本文件”。
- **README 索引完整性**：目录内每个 md 文件必须以 Markdown 链接形式被本级 README 索引，纯文本提及文件名不算索引；不允许孤儿文件（doc-lint 检查项①）。存量仓库首次升级脚本后，既往纯文本提及式索引的文件被报孤儿属判定收紧的预期结果：按链接形式补索引即可，重跑验证。
- 任务结束时把可复用结论提升到事实源，过程材料保留在 `tasks/`。

## 初始化输出清单

- 更新或创建 `AGENTS.md`，≤150 行，写入文档治理规则与读取顺序。
- 创建 `docs/README.md`，包含读取顺序和目录职责。
- 为 `architecture/`、`engineering/` 创建 README 作为事实源入口。
- 为 `product/`、`operations/`、`decisions/`、`governance/`、`tasks/` 创建短 README（有内容预期时）。
- 每个活文档补 frontmatter（`status`/`covers`/`last_verified`，规则见 `freshness-policy.md`）。
- 把技能母版脚本（`<技能基目录>/scripts/doc-lint.js`）复制到 `<仓库根>/scripts/doc-lint.js`，在 AGENTS.md 验证命令区登记 `node scripts/doc-lint.js .` 并运行它验证全绿（免复制的 agent 即时验收可用 `node "<技能基目录>/scripts/doc-lint.js" "<仓库根>"`，技能基目录为加载技能时注入的 Base directory）。

## 重组输出清单

- 现有文件按职责边界归位；同一事实指定唯一事实源，其余位置改为链接。
- 孤儿文件归位或登记进索引；死链修复或移除。
- 过时陈述核对代码后修正，无法立即修正的标注 `status: deprecated`。
- 补齐各层 README 索引后运行 doc-lint 验证；仓库无 `scripts/doc-lint.js` 副本则从技能母版落仓库并登记 AGENTS.md，副本版本（`--version`）落后于母版则更新。
