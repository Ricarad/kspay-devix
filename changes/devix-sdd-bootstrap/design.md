# kspay-devix 总体设计

## 1. 设计结论

Devix 不是一个新的代码托管器，而是位于多个业务 Git 仓库之上的“规格与工作现场控制层”。它由五个逻辑模块组成：

1. Change：每个需求的事实、方案、任务和验证证据。
2. Workflow：阶段、gate、暂停/恢复和变更回退规则。
3. Repository：仓库别名、分支映射、默认 checkout 与可选 worktree 现场。
4. Standards：AI 和开发者共享的编码、注释、测试规范。
5. Knowledge：未来承接跨需求稳定知识，首期只保留入口。

## 2. 从现有 changes 继承什么

### 2.1 保留

- `README + design + tasks` 的专项分区。
- 技术方案中基于真实调用链写接口、数据、兼容、测试和风险。
- 复杂需求可用 decisions 显式区分已确认、待确认与阻塞项。
- tasks 用里程碑表达实施顺序和依赖。

### 2.2 修正

- 当前状态不再同时散落于 README、tasks、decisions，以 `change.yaml` 为准。
- 将需求澄清并入 README，将测试、联调和发布证据统一到 verification，固定产物收敛为五个文件。
- 不再把同一 change 复制到多个工作区；规格只在 Devix 保存，代码仓库通过 manifest 引用。
- 分支不只写在“环境准备”任务中，而是成为每个仓库的必填状态。
- 通用规则从每次对话中移到根 AGENTS 和 standards。

## 3. 目录架构

```text
tracked by kspay-devix Git
├── changes/<change-id>/
├── templates/change/
├── standards/
├── docs/
├── knowledge/
├── AGENTS.md
└── devix.yaml

ignored local workspace
├── repos/<repo-id>/.git
└── .worktrees/<change-id>/<repo-id>
```

Devix Git 与业务仓库 Git 没有嵌套提交关系。`change.yaml` 只记录别名、路径、branch 和 HEAD 快照。

工具源码仓库与使用者工作空间分离。全局安装包包含 CLI、change/workspace 模板、standards 和 knowledge；`devix init` 生成的工作空间只包含 `AGENTS.md、devix.yaml、repositories.yaml、changes、standards、knowledge、repos` 和本机 runtime，不暴露 `src/test/scripts/docs/templates`。

`repositories.yaml` 保存可共享的仓库 ID、Git URL、本地相对路径和基线分支。`devix repo add` 根据它 clone 到 `repos/`；change.yaml 只引用仓库 ID、需求分支和恢复点，不重复保存 Git URL。

## 4. 状态与 gate

阶段采用：

```text
clarification -> design -> implementation -> verification -> closed
```

`status` 独立表达 active、paused、blocked、done、cancelled。进入 design 前要求 clarification gate 和知识读取完成；进入 implementation 前要求 design_review；进入 closed 前要求 verification。

## 5. 多需求切换

### 5.1 默认路径：checkout

直接使用 `repos/<repo>`，按 `change.yaml.repositories.feature_branch` 切换需求。该方式适合串行开发，可保持固定的本地目录、IDE 配置和 CodeGraph 索引。

需求 A 尚未完成但需要暂停时，先预检所有仓库。实际分支符合清单时，dirty 现场自动生成仅本地 WIP commit，记录 HEAD 后再 checkout 需求 B；任一分支偏差则停止并请求确认。恢复时切回 A 并对同一目录执行 CodeGraph sync。

Devix 只为符合预期的业务 feature branch 自动 stage 和 WIP commit；不自动 push、stash 或 reset，也不在 master/main 等基线分支上创建 WIP commit。Devix 自身的 change 状态不自动 commit/push。

### 5.2 可选路径：worktree

只有确实要同时操作同一仓库的多个需求时才显式启用。需求 A 和 B 分别使用 `.worktrees/A/<repo>`、`.worktrees/B/<repo>`，并为每个 worktree 维护独立 CodeGraph 索引。该模式不作为默认值。

### 5.3 恢复校验

恢复时比较 manifest 的 `feature_branch / last_known_head` 与 Git 实际值。偏差只报告并要求选择，不擅自把任一侧当正确答案。

## 6. 规范加载顺序

```text
Devix 根 AGENTS：工作流、gate、事实与现场安全
  -> 当前 change：需求目标、范围、决策与涉及仓库
  -> 目标业务仓库根 AGENTS
  -> 目标模块沿途更具体的 AGENTS（越近优先级越高）
  -> Devix standards：只补充仓库没有规定的内容
  -> 当前任务与测试计划
```

这里需要区分两类规则：

- Devix 负责需求生命周期、评审 gate、多仓库范围和 Git 现场安全。
- 业务仓库 `AGENTS.md` 负责代码风格、模块结构、注释、构建和测试方式；越接近目标代码的规则越优先。

因此，全局 standards 是业务仓库没有明确说明时的缺省值，不是覆盖仓库规则的上级规范。若仓库规范与已确认需求发生实质冲突，进入 decisions 显式处理。

## 7. CodeGraph 同步与代码读取

CodeGraph 是代码分析阶段的标准入口，而不只是可选搜索工具：

```text
checkout 需求对应分支（或显式进入 worktree）
  -> 读取目标仓库及模块 AGENTS.md
  -> 检查当前代码目录的 .codegraph/
  -> codegraph sync <当前代码目录>
  -> codegraph explore / node 获取源码与调用链
  -> callers / callees / impact / affected 深入分析
  -> CodeGraph 不足时再用 rg 与直接读文件补充
```

必须对“当前实际工作目录”同步。worktree 是独立分支现场，不能复用基础 clone 或另一个 worktree 的索引来声称已验证当前代码。

sync 的强制触发点：

1. checkout、worktree 切换、pull、rebase 等 HEAD 变化后，第一次代码分析前。
2. 完成一批代码修改后，进行影响分析、测试选择或最终调用链复核前。

`.codegraph/` 不存在时只记录缺失，不自动 init，因为是否建立索引属于仓库/用户决策；sync 失败时禁止继续引用可能陈旧的 CodeGraph 结果。

## 8. CLI 与活动 change

`.devix/runtime/workspace-state.yaml` 保存本机 active change。CLI 提供 `new/switch/pause/status/validate/advance`：先完成所有仓库预检和当前 change 快照，再切换目标分支；恢复成功后输出核心文档、AGENTS、知识来源、下一步和 CodeGraph 状态。

## 9. 风险与取舍

- YAML 与 Markdown 仍可能冲突：通过职责分离和 validate 校验降低，不做双向自动同步。
- 自动 WIP 会提交该仓库全部非忽略修改，因此分支偏差时必须先确认，不能把未知现场静默归属到 change。
- 全局规范容易无限膨胀：只保存跨仓库底线，仓库特定规则必须下沉。
- Devix 不能替代 Git 提交：暂停时必须明确未提交现场没有中心化保存。
- worktree 仍是可选能力；一旦启用，每个 worktree 都要单独建立并维护 CodeGraph 索引。
