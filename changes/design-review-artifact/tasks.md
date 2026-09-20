# 任务拆解

状态：`todo / doing / blocked / done / cancelled`。

| ID | 阶段 | 仓库 | 任务 | 依赖 | 状态 | 完成证据 |
|---|---|---|---|---|---|---|
| D1 | design | kspay-devix | 完成双视图产物模型、兼容边界和模板设计 | clarification | done | `design.md`、`design-review.md` |
| I1 | implementation | kspay-devix | 修改 change manifest、文件生成、上下文发现和 Delta/Major 文档清单 | D1 | done | `src/files.js`、`src/change-service.js` |
| I2 | implementation | kspay-devix | 更新 AI/人工方案模板、命令、skill、AGENTS 和工作流文档 | D1 | done | 发布源模板和文档已同步 |
| V1 | verification | kspay-devix | 增加新 change、旧 change、严格校验和 revise 兼容测试 | I1 | done | `npm test` 42/42 |
| V2 | verification | kspay-devix | 运行 npm test、npm run check、严格校验和 diff 检查 | V1 | done | 本地检查通过；发布 gate 待确认 |

## 代码产物清单

`/devix-code` 对每一批代码修改都必须登记，至少精确到类、接口、枚举或同等语言构造。删除的产物也要保留记录，不能只写文件名。

| ID | 仓库 | 文件 | 类/接口/枚举 | 变更类型 | 生成或修改内容 | 单测目标 | 单测状态 |
|---|---|---|---|---|---|---|---|
| C1 | kspay-devix | `src/change-service.js` | `newManifest`、`createChangeFiles`、`buildContext`、`reviseChange`、`validateStrictArtifacts` | modified | 支持受 manifest 控制的 `design-review.md` 产物及 Delta/Major 同步 | `test/change-service.test.js` | passed |
| C2 | kspay-devix | `src/files.js` | change 文件产物生成逻辑 | modified | 保持六文件核心集合并生成 v2 评审版可选产物 | `test/change-service.test.js` | passed |
| C3 | kspay-devix | `templates/change/design.md` | AI 实施版模板 | modified | 标明权威关系并加入关键事实摘要 | 文档检查 | not_applicable |
| C4 | kspay-devix | `templates/change/design-review.md` | 人工评审版模板 | added | 提供独立可读的评审结构 | 文档检查 | not_applicable |
| C5 | kspay-devix | `templates/change/README.md`、`templates/commands/*`、`plugins/*`、`AGENTS.md`、`docs/*` | 工作流文档和提示 | modified | 明确两份方案职责、同步规则和兼容边界 | `npm run check` | not_applicable |
| C6 | kspay-devix | `test/change-service.test.js` | change artifact compatibility tests | modified | 覆盖新 v2、旧 v2、schema v1 和严格 clarification 校验 | `npm test` | passed |
| C7 | kspay-devix | `test/workflow-agent.test.js` | intake/revision artifact tests | modified | 覆盖 intake 生成评审文件和 Delta 受影响文档 | `npm test` | passed |

变更类型使用 `added / modified / deleted / generated-test`；单测状态使用 `todo / generated / passed / failed / not_applicable`。不适合单测的产物必须填写原因。

## 当前阻塞项

- `release_readiness` 尚未由发布负责人确认；在确认前不推进 verification/closed。

## 下一步动作

等待用户或发布负责人确认发布准备后，进入 verification；当前实现和本地检查已完成。
