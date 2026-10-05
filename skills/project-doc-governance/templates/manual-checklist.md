# 无 Node 环境时的人工检查表

doc-lint 需要 Node ≥ 18。环境不具备时，按本表人工过一遍——覆盖的是检查器里最容易出问题、人工成本又最低的几项。

## ① 可达性

- [ ] 从 `docs/README.md` 出发，逐层点开链接。每个 md 都能在 3 跳内到达吗？
- [ ] 有没有整个目录没人链接（孤立子树）？
- [ ] 每个含 md 的目录都有 `README.md` 吗？

## ② 死链

- [ ] 所有相对链接的目标文件真实存在？
- [ ] 带锚点的链接（`x.md#section`）锚点还在吗？

## ③ frontmatter

- [ ] 每个活文档都有 `status` / `last_verified`？
- [ ] `status` 是 `living` / `snapshot` / `deprecated` 之一（ADR 用 `accepted` / `superseded` / `rejected`）？
- [ ] 非代码类活文档标了 `scope: process`？
- [ ] `last_verified` 是 `YYYY-MM-DD` 且不是未来日期？
- [ ] `status: living` 且 `scope: code` 的文档有 `covers`？

## ④⑤ 漂移与预算

- [ ] `covers` 里的路径都真实存在？
- [ ] 最近改过的代码路径，其 `covers` 文档是否同步更新了？
- [ ] agent 入口文件 ≤150 行？

## ⑧ tasks 索引

- [ ] 热索引登记了所有 `docs/tasks/` 下的任务目录？
- [ ] 归档的任务都登记进 `archive/README.md`？
- [ ] 热索引没有把已归档任务当成本地目录引用（应写 `archive/` 前缀）？

## ⑨ 体积

- [ ] 事实源活文档有没有超过 400 行、只增不减的？
