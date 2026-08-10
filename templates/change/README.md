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
| [`verification.md`](./verification.md) | 单测、联调、发布与最终验证证据 |
