# Devix Release 文档与发布门禁

## 当前状态

- 阶段：以 `change.yaml.phase` 为准
- 状态：以 `change.yaml.status` 为准
- 下一步：以 `change.yaml.next_action` 为准

## 目标与范围

为每个新 change 固定生成 `release.md`，集中管理远程配置、基础组件、部署顺序、环境差异、回滚和上线后动作。文档覆盖 Staging、PRT、Prod，但只展开本需求实际涉及的组件，禁止生成无关的 RPC、Task、Redis 等空章节。进入 verification 前通过条件式发布准备门禁，避免开发完成后才临时补上线 SOP。

## 原始输入与背景

用户指出需求开发中缺少 Kconf/Kconfig、Redis、Task、RPC 等配置的统一发布记录，尤其需要区分三个环境以及上线前、上线后动作。参考文件为 `/Users/chenshaojie/IdeaProjects/my-devix/changes/pugongying-aigc/release.md`，仅用于理解现状，不直接修改消费者工作空间。

## 成功标准

- 新 change 使用 schema v2，并固定生成六个核心文件。
- `release.md` 只出现真实涉及的组件章节。
- 发布影响未判断或准备未确认时不能进入 verification。
- schema v1 的旧五文件 change 保持可校验、可恢复。
- `devix update` 只同步平台规则、CLI 和新模板，不修改已有 change。

## 包含范围

- change schema、模板生成、validate/advance/context 恢复。
- Release 编写规范、生命周期规则和自动化测试。
- 版本升级、GitHub main 发布。

## 不包含范围

- 不修改或迁移 `my-devix` 中的现有 change。
- 不新增独立 release 生命周期阶段。
- 不接入真实 Kconf、Redis、Task 或 RPC 管理平台。

## 角色与业务场景

## 验收标准

| ID | 场景 | Given | When | Then | 验证方式 |
|---|---|---|---|---|---|
| A1 | 新建需求 | 使用最新版 CLI | 创建 change | 生成 schema v2 和六个核心文件 | 自动化测试 |
| A2 | 按需文档 | 新建 release 模板 | 查看正文 | 不包含组件专属空章节 | 模板断言 |
| A3 | 发布门禁 | 发布影响为 pending | 进入 verification | 被明确阻止 | 阶段测试 |
| A4 | 兼容旧需求 | schema v1 只有五文件 | validate/switch | 保持有效 | 兼容测试 |
| A5 | 消费者更新 | 已有本地 changes | 执行 update | 仅同步托管文件 | 更新测试 |

## 关键结论与待确认项

- 已确认：`release.md` 是新 change 的固定第六份核心文件。
- 已确认：正文按实际影响面展开，不保留无关组件标题或空表格。
- 已确认：采用进入 verification 前的条件式发布准备门禁。
- 无待确认项。

## 文档入口

| 文件 | 用途 |
|---|---|
| [`change.yaml`](./change.yaml) | 状态、gate、仓库与分支 |
| [`README.md`](./README.md) | 需求澄清、范围、验收标准和关键结论 |
| [`design.md`](./design.md) | 技术方案 |
| [`tasks.md`](./tasks.md) | 实施任务与进度 |
| [`release.md`](./release.md) | 发布配置、环境差异、上线 SOP 和回滚 |
| [`verification.md`](./verification.md) | 单测、联调、发布与最终验证证据 |
| [`decisions.md`](./decisions.md) | 已确认的核心取舍 |

## 事实落档与恢复规则

- 已确认变化先落档、清理冲突旧描述，再继续编码：需求与验收写本文件，技术方案写 `design.md`，已确认取舍写可选的 `decisions.md`，任务进度写 `tasks.md`，状态与恢复摘要写 `change.yaml`，验证证据写 `verification.md`。
- 当前 change 禁止使用任何跨会话 memory 作为临时中转、正文备份、事实来源或恢复入口。
- `change.yaml.resume.context_summary` 只提供简洁恢复摘要和文档入口，不能替代正式方案。
- 上下文压缩、新会话、暂停、切换或交接前，检查所有 change 文件内容一致；新会话只从这些文件、登记的知识来源和当前代码事实恢复。
