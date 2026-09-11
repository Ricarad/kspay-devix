# 任务拆解

状态：`todo / doing / blocked / done / cancelled`。

| ID | 阶段 | 仓库 | 任务 | 依赖 | 状态 | 完成证据 |
|---|---|---|---|---|---|---|
| P1 | implementation | kspay-devix | 在 `src/repository-service.js` 新增 `discoverRepositories`，扫描 `repos/` 直接子目录并幂等写入本地 catalog；无法判断分支时返回 `needs_confirmation` | design review | todo | 单元测试 |
| P2 | implementation | kspay-devix | 在 `src/cli.js` 增加 `devix repo discover` 命令和帮助文本 | P1 | todo | CLI 测试 |
| P3 | implementation | kspay-devix | 在 `src/change-service.js:intakeChange` 前置调用发现服务，保留发现结果并确保不自动改业务仓库分支 | P1 | todo | intake 集成测试 |
| P4 | implementation | kspay-devix | 更新根 README、工作空间 README 和安装导览，区分本地发现与远程 `repo add` | P1-P3 | todo | 文档检查 |
| P5 | verification | kspay-devix | 执行单测、工作区检查、包边界检查和 diff 检查 | P1-P4 | todo | `verification.md` |

## 代码产物清单

- `src/repository-service.js`: `discoverRepositories` 函数及本地 catalog 条目构造逻辑。
- `src/cli.js`: `repo discover` 命令分支和 usage 文本。
- `src/change-service.js`: `intakeChange` 的发现调用。
- `test/change-service.test.js`: 本地仓库发现正常、幂等、无效目录跳过、分支确认和 CLI 输出测试。
- `test/workflow-agent.test.js`: intake 自动发现并保留需求流程行为的测试。

## 当前阻塞项

- D4：已有但不完整 catalog 条目的保护策略，当前按“不接管、不覆盖”设计，待设计评审确认。

## 下一步动作

设计评审通过后进入 implementation，先实现 P1，再接入 intake 和 CLI，最后更新文档与测试。
