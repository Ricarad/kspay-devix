# Devix SDD 工作流

## 1. 五阶段状态模型

`phase` 表示需求阶段，`status` 表示当前能否继续，两者独立：

| 阶段 | 主要问题与产物 | 退出条件 |
|---|---|---|
| clarification | README 中的目标、范围、场景、验收、待确认项和发布影响初判 | clarification gate 通过，并完成知识读取或明确 not_found |
| design | CodeGraph/代码现状、技术方案、tasks、验证设计和实际涉及的发布 SOP | design_review gate 通过 |
| implementation | 按 tasks 修改业务代码并局部验证 | 实现完成，可进入统一验证 |
| verification | verification 中的单测、联调和回归证据；release 中的实际发布记录 | verification gate 通过，发布事项完成 |
| closed | 需求、恢复摘要和可复用知识收口 | 状态改为 done |

`status` 使用 `active / paused / blocked / done / cancelled`。例如方案等待产品确认时是 `phase: design`、`status: blocked`。

## 2. 固定产物

schema v2 的每个 change 固定包含 `change.yaml、README.md、design.md、tasks.md、release.md、verification.md`。复杂决策可另建 `decisions.md`，但当前阶段、分支、发布状态和恢复点始终以 `change.yaml` 为准。schema v1 的旧五文件 change 保持兼容；若已自行增加 `release.md`，恢复时也会加载。

`release.md` 固定存在，但内容按需展开：没有某类组件影响时不写对应标题或空表格。完整规则见 [`standards/release.md`](../standards/release.md)。

## 3. 知识、AGENTS 与代码分析

标准顺序：

```text
需求澄清
  -> 定向读取 knowledge，记录 knowledge_status 与 knowledge_sources
  -> 确定涉及仓库和模块
  -> checkout feature branch
  -> 读取仓库根目录到目标模块沿途的 AGENTS.md
  -> 当前目录存在 .codegraph 时执行 codegraph sync
  -> explore/node 阅读源码和调用链
  -> CodeGraph 不足时再用 rg 补充
```

仓库及模块 `AGENTS.md` 决定代码、构建和测试规范，Devix standards 只补充未覆盖部分。CodeGraph 不存在时不自动 init；sync 失败时不得使用旧索引作为当前分支事实。

## 4. Gate 规则

Gate 状态为 `pending / passed / failed / waived`：

- 进入 design：clarification 必须通过，且知识状态为 `loaded` 或 `not_found`。
- 进入 implementation：design_review 必须通过。
- 进入 verification：required change 必须达到 release ready 且 release_readiness passed；无发布影响时必须明确 not_required 和 waived。
- 进入 closed：verification 必须通过。
- `passed/waived` 必须记录确认人和证据，AI 不自行批准人工 gate。

使用 `devix change advance <id> --to <phase>` 只允许单步推进，并自动检查上述条件。

## 5. 新需求、暂停与恢复

本机 `.devix/runtime/workspace-state.yaml` 保存唯一的 active change，不进入 Git。分支、HEAD、快照、知识来源和恢复摘要写入对应 `change.yaml`。

新需求到来时：

1. 预检当前 active change 的所有仓库。
2. 实际分支符合清单且 dirty 时，自动提交本地 `WIP(devix): pause <change-id>`；干净时记录 HEAD。
3. 任一仓库分支偏差、detached、脏 main/master 或预检失败时，所有仓库都不开始 commit/checkout，并请求确认。
4. 快照全部成功后暂停旧 change，生成并激活新 change。
5. 切换目标分支后同步 CodeGraph，输出需要恢复的核心文件、AGENTS、知识来源和下一步。

切回历史 change 使用相同的两阶段规则：先完整预检和保存当前 change，再检查目标分支与 `last_known_head`。HEAD 漂移时停止，不 reset；切换成功后重新加载规格上下文。

## 6. 事实落档与跨会话恢复

当前 change 不使用任何跨会话 memory 保存或恢复需求事实。需求与验收、技术方案、已确认决策、任务进度、发布配置与 SOP、生命周期状态和验证证据必须分别落在 `README.md`、`design.md`、`decisions.md`、`tasks.md`、`release.md`、`change.yaml` 和 `verification.md` 中。

用户确认方案或代码事实变化后，先同步所有受影响文件并删除失效描述，再继续编码。`resume.context_summary` 只概括当前进度、下一步和正式文档入口，不能复制或替代完整方案。预计上下文压缩、准备新会话、暂停或切换 change、工作交接或结束工作前，应完成一次文件一致性检查；新会话只从 change 文件、已登记知识来源和当前代码事实恢复。

`knowledge/` 仅保存已经验证、可跨需求复用的通用知识，不保存单个 change 的过程状态或方案正文。
