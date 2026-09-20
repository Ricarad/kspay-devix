# Devix 与现有 AI 规范盘点

## 盘点范围

- 盘点目录：`/Users/chenshaojie/IdeaProjects/my-devix/repos`
- 盘点日期：2026-08-25
- 目标：比较 Devix 与现有 Harness、Changesets/ChangeSet 类规范的职责差异，并盘点每个代码仓库的 AI 入口、约束、知识和变更文档目录。
- 排除项：`.git/`、`.repo/`、`target/`、`node_modules/`、`dist/` 和 `.codegraph/` 索引不作为 AI 规范统计；CodeGraph 只用于确认当前仓库状态。

本次目录中没有发现标准的 `.changeset/`、`changesets/` 或 `change-set/` 目录。因此本文将 “ChangeSet” 按通常的 Changesets/变更集概念比较；如果团队另有一套内部 ChangeSet 规范，需要再补充其路径和规则。

## 一句话结论

这些仓库不是没有规范，而是规范分布在不同层级、不同客户端和不同生命周期文件中：`AGENTS.md`、`CLAUDE.md`、Harness、Cursor Rules、CodeFlicker Skill、普通 Markdown、计划文件和测试报告并存。Devix 的价值不在于替代这些仓库内部规则，而在于提供一个跨仓库、跨客户端、可恢复且有 gate 的变更控制层。

```text
Harness / AGENTS / Skills
    负责：单个仓库内部怎么写代码、怎么遵循领域约束

Devix
    负责：一次需求如何澄清、设计、实现、验证、发布和恢复
```

## Devix 的核心优势

### 1. 把“仓库规则”与“需求过程”分开

Harness 擅长沉淀 Java、Spring、RPC、Kconf、Redis、Task、MQ、前端组件等仓库知识。Devix 不要求把这些领域细节复制到平台层，而是通过仓库级 `AGENTS.md` 和模块级规则读取它们，再统一管理需求生命周期。

这样可以同时保留：

- 仓库自身的代码风格和历史兼容规则。
- 跨仓库统一的需求、设计、验证和发布流程。
- 不同 AI 客户端下相同的阶段语义和产物契约。

### 2. 从四阶段提示词流程升级为可追踪的变更状态机

当前 Harness 常见的流程是“理解 -> 规划 -> 执行 -> 交付”，主要通过提示词、计划文件和交付清单约束 AI。

Devix 使用固定阶段和 gate：

```text
clarification -> design -> implementation -> verification -> closed
      |              |             |              |             |
   README/决策    技术方案/任务    业务代码       测试证据       收口/恢复
```

`change.yaml` 记录机器可读的阶段、状态、仓库、分支、gate、阻塞项和下一步动作；阶段不能靠 AI 自己跳过。

### 3. 对多仓库需求提供统一影响面

现有仓库大多以单仓库为边界，即使有 `CROSS_REPO_LANDSCAPE.md`，也通常只是某个仓库自己的说明文档。Devix 的 change 可以统一登记多个业务仓库、模块和分支，并在切换需求时检查：

- 当前分支是否符合 change 记录。
- HEAD 是否发生漂移。
- 是否存在未保存的修改。
- 是否需要本地 WIP 快照。
- CodeGraph 是否已同步。

### 4. 把“计划”和“证据”分开

很多 Harness 交付模板会在同一份回复或计划里同时写“准备执行”和“已经通过”。Devix 将事实拆开：

- `tasks.md`：要做什么、做到了哪里，以及具体改了哪些类。
- `release.md`：发布影响、环境差异、上线 SOP、监控和回滚。
- `verification.md`：真实执行过的命令、环境、结果和未覆盖项。

未运行的测试不能写成 `passed`，计划中的发布动作也不能当作已完成证据。

### 5. 对人工确认和发布准备提供显式 gate

Devix 的 `clarification`、`design_review`、`release_readiness` 和 `verification` gate 都要求 reviewer 和 evidence。AI 可以整理事实和提出方案，但不能自行把需要产品、架构师、仓库负责人或发布负责人的 gate 标记为通过。

### 6. 让跨会话恢复依赖正式事实，而不是聊天记忆

Harness 通常会有 `memory/`、`current-plan.md` 或经验文件。它们对单仓库工作很有帮助，但容易和当前需求状态混在一起。Devix 明确规定：

- 需求事实写 `README.md`。
- 权威技术方案写 `design.md`，人工评审表达写派生的 `design-review.md`。
- 已确认取舍写 `decisions.md`。
- 任务进度写 `tasks.md`。
- 发布事实写 `release.md`。
- 测试证据写 `verification.md`。
- 状态和恢复点写 `change.yaml`。

`resume.context_summary` 只做入口摘要，不能替代正式文档。

## 与 Harness、Changesets 的职责对比

| 维度 | 仓库 Harness / AI 规则 | Changesets / ChangeSet | Devix |
|---|---|---|---|
| 主要边界 | 单仓库、单客户端或单语言栈 | 包版本和发布说明 | 多仓库需求生命周期 |
| 解决问题 | AI 如何写代码 | 代码如何进入版本发布 | 需求如何从澄清走到验证和发布 |
| 典型产物 | `CLAUDE.md`、`AGENTS.md`、guardrails、prompts、skills、memory、plan | changeset 文件、版本信息、changelog | `change.yaml`、`README.md`、`design.md`、`design-review.md`、`tasks.md`、`release.md`、`verification.md` |
| 状态控制 | 多由提示词和 checklist 约束 | 主要是版本发布状态 | 有固定 phase、status 和 gate |
| 跨仓库能力 | 通常需要人工约定 | 主要围绕包依赖 | 原生登记仓库、模块、分支和影响面 |
| 设计评审 | 通常是计划或文档约定 | 不负责 | `design_review` gate |
| 发布治理 | 规则可能写在技术方案或交付模板中 | 版本/changelog 为主 | `release.md`、环境差异、监控、回滚和 `release_readiness` |
| 测试证据 | 输出护栏、Hook、报告或人工清单 | 通常不负责 | `verification.md` 和真实执行证据 |
| 恢复方式 | 依赖仓库记忆、计划或当前会话 | 依赖变更文件 | 依赖正式 change 文件和 runtime 状态 |

最合理的组合不是二选一：

```text
Devix change
  ├── 读取并遵守仓库 AGENTS / Harness / Skills
  ├── 管理多仓库需求、阶段和 gate
  └── 在 release 阶段关联 Changeset、changelog 或发布单
```

## 仓库 AI 规范与文档目录盘点

### 1. kspay-promo

路径：`/Users/chenshaojie/IdeaProjects/my-devix/repos/kspay-promo`

```text
kspay-promo/
├── AGENTS.md
├── CLAUDE.md
├── .harness/
│   ├── ARCHITECTURE.md
│   ├── README.md
│   ├── TUTORIAL.md
│   ├── CLAUDE.md
│   ├── guardrails/
│   │   ├── input-guard.md
│   │   ├── output-guard.md
│   │   └── red-lines.md
│   ├── hooks/
│   │   ├── post-generation.md
│   │   └── pre-commit.md
│   ├── memory/
│   │   ├── context.md
│   │   ├── conventions.md
│   │   ├── decisions.md
│   │   └── lessons-learned.md
│   ├── plans/
│   │   ├── current-plan.md
│   │   └── plan-template.md
│   ├── system-prompts/
│   │   ├── coding-rules.md
│   │   ├── java-best-practices.md
│   │   ├── role.md
│   │   ├── spring-rules.md
│   │   ├── techspec-rules.md
│   │   ├── testing-rules.md
│   │   └── workflow-rules.md
│   ├── skills/
│   ├── evals/rubrics/
│   ├── reports/
│   └── tools/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── domain/                  # 11 个领域文档
│   ├── 方案设计.md
│   └── diagrams/
└── 各业务模块/
```

判断：AI 规范最完整，但入口、规则、记忆、计划、报告、技能和评估分布在多个层级；`AGENTS.md`、`CLAUDE.md` 和 `.harness/CLAUDE.md` 存在入口重复。它非常适合作为“仓库内部规则层”，但仍需要 Devix 统一跨仓库变更过程。

### 2. kspay-promo-touch

路径：`/Users/chenshaojie/IdeaProjects/my-devix/repos/kspay-promo-touch`

```text
kspay-promo-touch/
├── AGENTS.md
├── CLAUDE.md
├── CROSS_REPO_LANDSCAPE.md
├── docs/
│   ├── agent-context/
│   │   ├── README.md
│   │   ├── constraints.md
│   │   ├── architecture.md
│   │   ├── build-and-testing.md
│   │   ├── delivery-paths.md
│   │   └── runtime-components.md
│   └── specs/                   # 17 个按日期命名的设计/需求文档
├── aigc-material-agent/
│   ├── system-prompt.md
│   ├── skills/generate-text-material/
│   ├── references/
│   ├── scripts/
│   └── test-cases/
└── 各业务模块/
```

判断：这是当前最接近“集中式上下文路由”的仓库。`AGENTS.md` 和 `CLAUDE.md` 都指向唯一的 `constraints.md`，但需求 Spec、长期上下文和 AIGC Agent 仍是三套并行体系，缺少统一状态、评审 gate 和验证闭环。

### 3. kspay-platform-promo-activity-manage-pc

路径：`/Users/chenshaojie/IdeaProjects/my-devix/repos/kspay-platform-promo-activity-manage-pc`

```text
kspay-platform-promo-activity-manage-pc/
├── AGENTS.md                         # 372 行前端开发约束
├── .cursor/rules/templates/base/
│   └── web-base-rules.mdc
├── .codeflicker/
│   ├── skills/diff-verification-workflow/
│   │   ├── SKILL.md
│   │   ├── docs/
│   │   ├── scripts/
│   │   └── templates/
│   └── discuss/2026-05-14/.../
│       ├── outline.md
│       ├── meta.yaml
│       ├── decisions/
│       └── notes/
├── skills/
│   ├── frontend-dev-standard/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── examples/
│   └── frontend-tech-design/
│       ├── SKILL.md
│       ├── references/
│       ├── examples/
│       └── templates/
├── docs/                              # 多份前端技术方案
├── scripts/diff-parallel-verify.js
└── src/
```

判断：规范最分散。相同的开发约束分别存在于 `AGENTS.md`、Cursor Rules、CodeFlicker Skill 和 `skills/`；讨论记录又使用另一套 `outline/decisions/notes/meta` 目录，明显具有 AI 产物风格。

### 4. kspay-crm

路径：`/Users/chenshaojie/IdeaProjects/my-devix/repos/kspay-crm`

```text
kspay-crm/
├── AGENTS.md                         # Wali 管理的工作流入口
├── .claude/settings.json             # Claude 读取权限黑名单
├── CONTEXT.md
├── PROJECT_README.md
├── docs/agents/
│   ├── codebase-map.md
│   ├── domain.md
│   ├── harness-gap.md
│   ├── issue-tracker.md
│   ├── java.md
│   ├── triage-labels.md
│   ├── workflow-template.md
│   └── workflows.md
├── kspay-crm-api/AGENTS.md
├── kspay-crm-common/AGENTS.md
├── kspay-crm-component/AGENTS.md
├── kspay-crm-open-sdk/AGENTS.md
├── kspay-crm-operator-api/AGENTS.md
├── kspay-crm-runner/AGENTS.md
└── kspay-crm-sdk/AGENTS.md
```

判断：根入口较短，模块 `AGENTS.md` 统一且明显是工具生成的元数据；`docs/agents/codebase-map.md`、`java.md`、`harness-gap.md` 也明显是静态巡检产物。相比 Harness 更规整，但工作流依赖外部运行时 Skill，仓库内没有 Devix 式 change 和发布证据。

### 5. kspay-promo-api

路径：`/Users/chenshaojie/IdeaProjects/my-devix/repos/kspay-promo-api`

```text
kspay-promo-api/
├── README.md                         # 默认仓库初始化模板
├── pom.xml
├── .codegraph/
├── kspay-promo-api-component/
└── kspay-promo-crm-api/
```

判断：未发现根 `AGENTS.md`、`CLAUDE.md`、`.harness/`、`.cursor/rules/`、`skills/` 或 `docs/agent-context/`。同一业务域中存在几乎没有 AI 约束的仓库，正是需要统一工作区入口的场景。

### 6. kspay-promo-finance-asset

路径：`/Users/chenshaojie/IdeaProjects/my-devix/repos/kspay-promo-finance-asset`

```text
kspay-promo-finance-asset/
├── README.md                         # 默认仓库初始化模板
├── pom.xml
├── .codegraph/
├── kspay-promo-finance-asset-component/
├── kspay-promo-finance-asset-runner/
├── kspay-promo-finance-asset-sdk/
├── kspay-promo-finance-asset-service-client/
└── kspay-promo-finance-asset-test/
```

判断：未发现专门的 AI 约束、Harness、Cursor Rules、Skill 或结构化需求目录。它与 `kspay-promo` 的规则密度形成明显对比。

## 当前不统一的具体表现

| 维度 | 当前状态 |
|---|---|
| AI 入口 | `AGENTS.md`、`CLAUDE.md`、Wali、Cursor、CodeFlicker、Harness 并存 |
| 规则位置 | 根目录、模块目录、`.harness/`、`docs/agents/`、`skills/` 都有 |
| 需求产物 | `docs/specs/`、`.harness/plans/`、`.codeflicker/discuss/` 和普通 Markdown 并存 |
| 记忆机制 | Harness `memory/`、`CONTEXT.md`、`agent-context/` 并存 |
| 验证方式 | Hook、脚本、Skill、报告和人工 checklist 并存 |
| 发布记录 | 有些写技术方案，有些写交付模板，有些没有独立发布记录 |
| 跨仓关系 | 只有少数仓库维护 `CROSS_REPO_LANDSCAPE.md`，没有统一 change 影响面 |
| 生命周期 | 没有统一的 clarification/design/implementation/verification/closed 状态机 |
| 轻量仓库 | `kspay-promo-api` 和 `kspay-promo-finance-asset` 几乎没有 AI 规范 |

## 适合分享给同事的定位

可以把 Devix 的价值概括成五句话：

1. 把分散在不同仓库、不同客户端、不同目录里的 AI 规则，纳入统一入口和层级。
2. 把一次需求从聊天指令变成可恢复、可评审、可验证的 change 规格包。
3. 把单仓库 Harness 做不到的跨仓库影响面、分支安全和发布顺序统一管理起来。
4. 把设计、代码、测试、发布从计划性文字变成有 gate、有 reviewer、有 evidence 的过程。
5. 保留每个仓库自己的领域规则，不要求所有仓库强行使用一种代码风格。

最准确的产品定位是：

> Harness 规定 AI 在一个仓库里如何工作；Devix 规定一个需求跨越多个仓库时，如何被共同理解、实施、验证和交付。

## 建议的演进边界

Devix 不应把所有仓库的领域规则复制到平台层。建议保持三层边界：

```text
平台层：Devix
  统一 change、阶段、gate、跨仓库现场、发布和验证事实

仓库层：AGENTS / Harness / Skills
  保留 Java、Spring、前端、RPC、业务领域和历史兼容规则

需求层：change 目录
  记录本次需求实际的目标、方案、决策、代码产物、发布和验证证据
```

这样既能减少“每个仓库一套 AI 流程”的重复建设，又不会丢失仓库自身最有价值的专业约束。
