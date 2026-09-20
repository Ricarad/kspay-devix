# 人工评审版技术方案

> 本文是从 `design.md`、`README.md`、`decisions.md` 和 `release.md` 提炼的人工评审视图，不产生独立决策。需要实现细节时，以 [`design.md`](./design.md) 为权威来源。

## 1. 背景与问题

当前 `design.md` 同时服务 AI 实施和人工评审，代码调用链、配置、任务和测试细节会掩盖方案判断重点。

## 2. 目标与范围

新建 change 默认同时产出 AI 实施版和人工评审版。保留 `design.md` 作为权威实施方案，新增 `design-review.md` 帮助评审人快速判断方案合理性、影响范围和实施条件。已有 change 不强制迁移。

## 3. 当前系统现状

当前 change 创建逻辑按 schema 的六个核心文件复制模板；设计命令和实现/验证技能默认读取 `design.md`。现有 manifest 没有方案视图产物标记。

## 4. 总体方案

新 schema v2 change 在 manifest 中写入 `artifacts.design_review: true`，创建时复制评审模板。六个核心文件集合保持不变，评审版作为受 manifest 控制的标准可选产物。两份方案共享关键事实摘要，评审版只调整内容组织和表达深度。

## 5. 主要改动与影响系统

改动涉及 Devix CLI 的 change 文件生成、上下文文件发现、Delta/Major 受影响文档清单、change 模板、命令和 skill 提示、工作流文档及测试。业务仓库、业务运行时和 CLI 命令集合不变。

## 6. 关键接口、数据与配置变化

- `change.yaml` 新增可选的 `artifacts.design_review` 布尔标记。
- 新 change 生成 `design-review.md`。
- 旧 change 没有该标记时继续按原六文件模型校验和恢复。

## 7. 兼容、发布、回滚与风险

发布通过 Devix 发布源和 `devix update` 传播。旧 change 不需要补文件；回滚发布源不会影响已有 change 中已经生成的评审文件。主要风险是两份文档内容漂移，通过共同关键事实摘要、设计阶段同步要求和人工 design review gate 控制。

## 8. 关键取舍与待确认事项

采用派生评审视图而不是两个同等权威文件，避免事实分叉和 schema 迁移。暂不实现自然语言语义 diff，由人工 gate 负责最终评审确认。
