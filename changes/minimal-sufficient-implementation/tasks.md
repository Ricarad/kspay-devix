# 任务拆解

状态：`todo / doing / blocked / done / cancelled`。

| ID | 阶段 | 仓库 | 任务 | 依赖 | 状态 | 完成证据 |
|---|---|---|---|---|---|---|
| P1 | implementation | kspay-devix | 在 `standards/coding.md` 增加最小充分实现、校验边界、快速失败和显式暴露不确定性规则 | design review | done | 规范章节 |
| P2 | verification | kspay-devix | 运行单测、工作区检查、文档和 diff 检查 | P1 | done | `verification.md` |
| P3 | release | kspay-devix | 提交并推送发布源，使消费者可通过 `devix update` 同步 | P2 | done | `cf18aeb` 已推送至 `origin/main` |

## 代码产物清单

`/devix-code` 对每一批代码修改都必须登记，至少精确到类、接口、枚举或同等语言构造。删除的产物也要保留记录，不能只写文件名。

| ID | 仓库 | 文件 | 类/接口/枚举 | 变更类型 | 生成或修改内容 | 单测目标 | 单测状态 |
|---|---|---|---|---|---|---|---|
| C1 | kspay-devix | `standards/coding.md` | `1.1 最小充分实现与校验边界`（Markdown 规范章节） | modified | 新增最小实现、边界校验、快速失败、抽象控制和不确定性记录规则 | 不适用；由工作区检查和文档验收覆盖 | not_applicable |

变更类型使用 `added / modified / deleted / generated-test`；单测状态使用 `todo / generated / passed / failed / not_applicable`。不适合单测的产物必须填写原因。

## 当前阻塞项

无。

## 下一步动作

规范修改、验证和发布源推送已完成；消费者工作空间执行 `devix update` 后补充同步证据。
