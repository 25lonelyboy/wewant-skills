# skills

自建 Claude Code / 多 agent 技能仓库。

## 用途

本仓库是自建技能的**唯一正本**。技能通过 GitHub 中转分发到各台机器，再由 cc-switch 安装并按 `enabled_*` 开关投递到各个 agent。

社区技能**不在本仓库**：它们由各自的上游仓库维护，通过 cc-switch 或对应 agent 的安装机制获取。把上游技能拷进本仓库会失去更新能力，且改动会被上游覆盖。

## 目录结构

```text
skills/                              仓库根
  skills/
    project-doc-governance/          技能：项目文档治理
      SKILL.md
      references/                    按需加载的规则文件
      scripts/                       doc-lint.js、final-state-rules.json、selftest.js
      templates/                     可粘贴的仓库侧产物（pre-commit、CI、hook 规则块等）
      fixtures/                      回归夹具（repo-broken / repo-clean）
      agents/                        其他 harness 的入口清单
  README.md
  CHANGELOG.md
```

每个技能一个子目录，内含 `SKILL.md` 与它自己的 `references/`、`scripts/`、`templates/`、`fixtures/`。新增技能时并列添加子目录即可，不需要改动已有技能。

## 技能清单

| 技能 | 说明 |
|---|---|
| `project-doc-governance` | 仓库文档分层、唯一事实源、ADR、新鲜度漂移检测、任务归档；写作取舍、溯源标注与可执行的 doc-lint 检查 |

台账（来源、启用状态、内容哈希）以 cc-switch 的 `skills` 表为准，本仓库不重复维护。

## 改技能与发布

改动必须落在**本仓库**，不直接改 cc-switch 的落盘目录（它记录内容哈希，且会从仓库拉取覆盖，本地手改必丢）。

```bash
# 1. 改内容
# 2. 本地验证（不需要安装到 agent）
node skills/project-doc-governance/scripts/selftest.js
node skills/project-doc-governance/scripts/doc-lint.js <某个仓库根>

# 3. 发布
git commit && git push
# 4. 在 cc-switch 里对技能执行更新 → 落盘点刷新 → 各 agent 生效
```

改技能的 `SKILL.md` 措辞后，只有经过第 4 步才能在 agent 里看到效果；改 `doc-lint.js` 本身则不必——它是独立脚本，可以直接在仓库里跑。

改了 `scripts/final-state-rules.json` 后，项目侧的 hook 副本需要重新生成（doc-lint ⑥ 会校验 `rules_version`）。

## 归档

`../skills-archive/` 存放历史快照（在仓库之外）：

- `project-doc-governance-v1-20260816.zip` —— 内容日期 2026-08-01，无 `scripts/`
- `project-doc-governance-v2-20260903.zip` —— 内容日期 2026-08-16，`doc-lint.js` 无 `VERSION`

两个 zip 的文件名日期是打包日期，与内容日期不一致；且都比本仓库的初始提交旧。仅作历史留存，不作为任何基线。
