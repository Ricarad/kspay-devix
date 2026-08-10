# kspay-devix 通用 SDD 工作区设计

## 当前状态

- 阶段：`design`
- 状态：`active`
- 本轮边界：完成架构、流程和模板设计；尚未实现 Devix CLI。

## 目标

把现有 `changes` 中已经有效的“需求分析—技术方案—决策—任务”方式提升为一套可复用、可校验、支持多 Git 仓库和多需求暂停/恢复的 SDD 工作区，并统一 AI 生成代码、注释和测试的基本规范。

## 文档入口

| 文件 | 用途 |
|---|---|
| [`change.yaml`](./change.yaml) | 本需求自身的状态和 gate |
| [`README.md`](./README.md) | 需求、范围、验收标准与专项入口 |
| [`design.md`](./design.md) | 总体架构、状态机和模块设计 |
| [`decisions.md`](./decisions.md) | 已采纳设计与待用户确认事项 |
| [`tasks.md`](./tasks.md) | 分阶段落地计划 |
| [`verification.md`](./verification.md) | 文档校验、CLI 测试与交付证据 |

## 背景

现有 `kspay/changes` 和 `kspay-marketing/changes` 已能集中保存技术方案、任务和决策，但状态散落在 Markdown，跨仓库分支没有统一登记，代码、注释、测试规范也需要每次重新告诉 AI。复制同一专项到两个工作区还会产生后续漂移风险。

## 成功标准

- 一个 Git 仓库中心化保存通用规格、规范和知识，个人 change 可自行决定是否提交。
- `repos/` 放多个独立业务 Git 仓库，但不进入 Devix Git。
- 每个 change 映射到各代码仓库的 feature branch、HEAD 和恢复摘要。
- 新需求到来时自动保存当前现场；切回历史 change 时自动恢复分支和规格上下文。
- 分支与预期不符时停止并请求确认，不能静默接管。
- AI 未经方案评审不提前编码，并遵守目标仓库 AGENTS 优先级。

## 包含范围

- 五阶段生命周期、五文件模板和 gate。
- 活动 change 本机指针、跨仓库分支快照与自动 WIP commit。
- checkout 优先的暂停、创建、切换和恢复。
- 知识库加载点、AGENTS 优先级和 CodeGraph sync。
- CLI 与临时 Git 仓库自动化测试。

## 不包含范围

- 自动 fetch、pull、push 或创建远程分支。
- 自动 `codegraph init`。
- 知识自动提炼、向量化或远程 Docs 同步。
- 替换业务仓库自身 AGENTS、构建系统和提交规范。

## 验收标准

| ID | 验收标准 |
|---|---|
| A1 | 新需求自动生成五个核心文件并成为 active change |
| A2 | change.yaml 可恢复阶段、下一步、知识来源、仓库分支和 HEAD |
| A3 | 干净分支可暂停，脏分支自动创建本地 WIP commit |
| A4 | 多仓库中任一预检失败时不开始 commit 或 checkout |
| A5 | 分支偏差、protected branch、detached HEAD 必须停止并请求确认 |
| A6 | 切回 change 后恢复各仓库分支并同步已有 CodeGraph 索引 |
| A7 | 进入 design 前必须记录知识库读取状态 |
| A8 | 业务仓库及模块 AGENTS 优先于 Devix 编码缺省规范 |
| A9 | Devix 不自动提交或推送自身 change 状态，业务 WIP 也不自动推送 |
| A10 | 使用者可通过 init 生成最小工作空间，并通过 Git URL 和基线分支自动登记、克隆业务仓库 |
| A11 | 日常只需提供需求描述或文档，AI 自动生成 change-id、整理输入并判断仓库，不要求用户填写 CLI 参数 |
| A12 | 可通过一条 npm exec 命令从 Devix Git 地址直接安装到指定空目录，无需预先全局安装 |
