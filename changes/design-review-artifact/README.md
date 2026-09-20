# Devix 技术方案双视图产出

## 当前状态

- 阶段：以 `change.yaml.phase` 为准
- 状态：以 `change.yaml.status` 为准
- 下一步：以 `change.yaml.next_action` 为准

## 目标与范围

当前 `design.md` 同时面向 AI 实施和人工技术评审，详细调用链、配置、测试和边界信息会掩盖方案目标、影响和关键取舍。本 change 为新 change 默认生成两种技术方案视图：`design.md` 继续作为唯一权威的 AI 实施方案，`design-review.md` 作为从同一事实派生的人工评审视图。两者只调整组织和表达深度，不改变需求、技术结论、影响范围、风险或待确认事项。

本 change 只修改 Devix 发布源、模板、技能、工作流文档和验证测试，不修改业务仓库代码，不新增 CLI 命令，不强制迁移已有 change。

## 原始输入与背景

记录用户提供的原始描述摘要，以及需求文档、本地文件或文档链接。不要要求用户为了适配 Devix 重新填写格式化参数。

## 成功标准

- 新建 schema v2 change 默认生成 `design-review.md`，并在 `change.yaml` 标记评审产物已启用。
- `design.md` 明确为权威 AI 实施版；`design-review.md` 能独立说明背景、目标、现状、方案、影响、关键取舍、风险、发布/回滚和待确认项。
- 旧 schema、旧 v2 change 和未启用评审产物的 change 继续通过现有兼容检查。
- Delta/Major 变更会把 `design-review.md` 纳入受影响文档，避免方案事实只更新一份。
- 通过工作区测试、严格校验、包检查和 diff 检查。

## 包含范围

- 更新 change 文件生成和上下文发现逻辑，支持受 manifest 控制的 `design-review.md`。
- 更新 AI 实施版、人工评审版模板以及 design/code/test 命令和技能说明。
- 更新 AGENTS、工作流、插件和 change 文档中的职责边界。
- 增加新 change、旧 change、严格校验和 Delta/Major 文档同步测试。

## 不包含范围

- 不升级 change schema 版本，不把 `design-review.md` 加入现有六文件核心集合。
- 不实现自然语言语义 diff 或自动判断两份方案是否完全等价。
- 不修改业务仓库、业务代码、运行时接口或发布平台。

## 角色与业务场景

- AI 实施：只读取 `design.md` 作为实现依据。
- 人工评审：优先读取 `design-review.md`，必要时再深入 `design.md`。
- Devix 生命周期：design 阶段生成并同步两份方案；design review gate 以评审版为主要材料。

## 验收标准

| ID | 场景 | Given | When | Then | 验证方式 |
|---|---|---|---|---|---|

## 关键结论与待确认项

> 未确认内容只能标为待确认或假设。复杂需求可增设 `decisions.md`。

## 文档入口

| 文件 | 用途 |
|---|---|
| [`change.yaml`](./change.yaml) | 状态、gate、仓库与分支 |
| [`README.md`](./README.md) | 需求澄清、范围、验收标准和关键结论 |
| [`design.md`](./design.md) | 权威 AI 实施方案 |
| [`design-review.md`](./design-review.md) | 人工评审视图（派生文档） |
| [`decisions.md`](./decisions.md) | 待决策项、确认决策与假设（structured change） |
| [`tasks.md`](./tasks.md) | 实施任务与进度 |
| [`release.md`](./release.md) | 发布配置、环境差异、上线 SOP、监控与回滚 |
| [`verification.md`](./verification.md) | 单测、联调与最终验证证据 |

## 事实落档与恢复规则

- 已确认变化先落档、清理冲突旧描述，再继续编码：需求与验收写本文件，权威技术方案写 `design.md`，人工评审视图写 `design-review.md`，已确认取舍写可选的 `decisions.md`，任务进度写 `tasks.md`，发布配置与上线 SOP 写 `release.md`，状态与恢复摘要写 `change.yaml`，测试与验收证据写 `verification.md`。
- 当前 change 禁止使用任何跨会话 memory 作为临时中转、正文备份、事实来源或恢复入口。
- `change.yaml.resume.context_summary` 只提供简洁恢复摘要和文档入口，不能替代正式方案。
- 上下文压缩、新会话、暂停、切换或交接前，检查所有 change 文件内容一致；新会话只从这些文件、登记的知识来源和当前代码事实恢复。

## Intake 记录

保留 `design.md` 作为唯一权威的 AI 实施方案，新增默认生成的 `design-review.md` 作为人工评审视图。两者基于同一批代码事实和已确认决策，保持旧 schema 与已有 change 兼容；更新产物生成、Delta/Major 文档同步、命令与技能说明、工作流文档和测试。`design-review.md` 作为派生视图，不产生独立决策。
