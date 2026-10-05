# 文档治理（粘贴进 agent 入口文件）

把下列内容粘进仓库的 agent 入口文件（`AGENTS.md`，或既有的 `CLAUDE.md`）。占位符按仓库实际情况替换：`<领域层列表>`、`<验证命令>`。

---

## 文档治理

- 读取顺序：本文件 → [docs/README.md](docs/README.md) → 对应领域 README → 最小主题文件。按需读取，不要求通读。
- 事实源：架构事实在 `docs/architecture/`，工程实践在 `docs/engineering/`，决策在 `docs/decisions/`（ADR），过程材料在 `docs/tasks/`。<领域层列表>
- 文档与代码冲突时以代码为准，并修复文档；信任活文档 frontmatter 的 `last_verified`，不信任编辑时间。
- 改变已文档化行为的代码变更，必须在同一提交内更新对应文档。
- 事实源文档是**改写式**的：只保留与当前事实匹配的内容，作废的直接删；过程记录写在 `docs/tasks/`（追加式）。
- 文档禁止写入密钥、token、账号密码、内网地址；需要引用时用 `<redacted>`。
- 新文档必须归位到对应层目录，并登记进该目录 README 索引。

## 验证

```bash
<验证命令>
node scripts/doc-lint.js .     # 副本为 .cjs 时替换
```
