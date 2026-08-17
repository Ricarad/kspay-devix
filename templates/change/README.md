# 需求名称

## 当前状态

- 阶段：以 `change.yaml.phase` 为准
- 状态：以 `change.yaml.status` 为准
- 下一步：以 `change.yaml.next_action` 为准

## 目标与范围

用 3—5 句话说明为什么做、为谁解决什么问题，以及明确不做什么。

## 原始输入与背景

记录用户提供的原始描述摘要，以及需求文档、本地文件或文档链接。不要要求用户为了适配 Devix 重新填写格式化参数。

## 成功标准

## 包含范围

## 不包含范围

## 角色与业务场景

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
| [`design.md`](./design.md) | 技术方案 |
| [`tasks.md`](./tasks.md) | 实施任务与进度 |
| [`release.md`](./release.md) | 发布配置、环境差异、上线 SOP、监控与回滚 |
| [`verification.md`](./verification.md) | 单测、联调与最终验证证据 |

## 事实落档与恢复规则

- 已确认变化先落档、清理冲突旧描述，再继续编码：需求与验收写本文件，技术方案写 `design.md`，已确认取舍写可选的 `decisions.md`，任务进度写 `tasks.md`，发布配置与上线 SOP 写 `release.md`，状态与恢复摘要写 `change.yaml`，测试与验收证据写 `verification.md`。
- 当前 change 禁止使用任何跨会话 memory 作为临时中转、正文备份、事实来源或恢复入口。
- `change.yaml.resume.context_summary` 只提供简洁恢复摘要和文档入口，不能替代正式方案。
- 上下文压缩、新会话、暂停、切换或交接前，检查所有 change 文件内容一致；新会话只从这些文件、登记的知识来源和当前代码事实恢复。
