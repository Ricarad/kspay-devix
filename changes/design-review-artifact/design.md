# AI 实施版技术方案（权威）

> `design.md` 是唯一权威的实施方案。`design-review.md` 是基于同一事实生成的人工评审视图，不产生独立决策。

## 关键事实摘要

- 产物模型：新 schema v2 change 默认生成 `design-review.md`，旧 change 不强制迁移。
- 兼容模型：`CORE_CHANGE_FILES` 继续保持六个核心文件；评审版由 `change.yaml.artifacts.design_review` 控制。
- 权威关系：实现和验证读取 `design.md`；人工 design review 主要读取 `design-review.md`。
- 一致性边界：两份文档都保留目标、范围、影响、接口/数据/配置、兼容性、风险和待确认项摘要；不实现自然语言语义 diff。
- 发布边界：只修改 Devix 发布源、模板、技能、文档、CLI 产物生成和测试，不修改业务仓库和运行时代码。

## 1. 目标、范围与约束

设计时参考团队《技术开发模板（25年新）》：<https://docs.corp.kuaishou.com/k/home/VaTVpRbldkYE/fcAD57ZEN315rWrrjSRE8VNIZ>。

按需检查方案选型、流程/架构、资金流/信息流、数据模型、接口、兼容性、旁支链路、单元化、安全、监控、资损防控、高可用、容量、灰度、回滚和关键时间节点。不适用的检查项明确写“无”并说明判断依据，避免为了套模板生成空的组件章节。

本 change 不升级 schema，不把 `design-review.md` 加入六文件核心集合，不新增 CLI 命令，不实现语义一致性自动判断。

## 2. 现状与真实代码路径

当前实现路径为：`newManifest` 在 `src/change-service.js` 创建 schema v2 manifest；`createChangeFiles` 调用 `src/files.js` 按核心文件和 manifest 产物标记复制模板；`buildContext` 将核心文件和存在的可选文件暴露给恢复上下文；`validateStrictArtifacts` 校验 clarification 阶段是否提前修改启用的评审文件；`reviseChange` 生成 Delta/Major 受影响文档清单。`scripts/check-workspace.js` 检查模板清单，`workspace-service.js` 初始化时复制模板，`update-service.js` 通过既有 managed path 同步模板。

本仓库没有 `.codegraph/`，代码事实通过直接读取上述源码、模板、测试和工作流文档确认。没有新增外部服务、数据库、RPC、KConf、任务或运行时接口。

涉及支付、资金、账务或 PX 链路时，补充资金流/信息流、记账影响、数据与接口上下游、旁支链路、资损风险和对账影响；涉及新 API、MQ、DB 集群或单元化链路时，补充单元化配置评估。

## 3. 方案概览

`design.md` 继续由现有模板生成并作为实现事实源。新增 `design-review.md` 模板和 manifest 标记：新 change 创建时复制评审模板；已有 change 因没有 `artifacts.design_review` 不要求补文件。评审模板只压缩表达深度，不复制完整调用链、任务拆解、测试矩阵和全部“不修改”边界。

设计阶段由 `/devix-design` 同步填写两份文件：AI 版保留实现所需细节；人工版填写独立可读的背景、目标、现状、总体方案、影响、关键接口/数据/配置、兼容发布回滚、取舍、风险和待确认事项。两份文件共享“关键事实摘要”，冲突时以 `README.md`、`decisions.md` 和 `design.md` 为依据，先修正权威事实再更新评审版。

## 4. 分仓库/模块改动

| 仓库 | 模块 | 改动 | 兼容影响 |
|---|---|---|---|
| kspay-devix | `src/files.js`、`src/change-service.js` | 生成和发现受 `artifacts.design_review` 控制的 `design-review.md`；Delta/Major 同步该文件 | 核心六文件集合不变；旧 manifest 无标记时不生成、不强制校验 |
| kspay-devix | `templates/change`、命令、skill、文档 | 增加人工评审模板并说明权威关系 | 只影响新 change 和后续消费者同步 |
| kspay-devix | `test`、`scripts/check-workspace.js` | 覆盖新产物、旧 change 兼容和模板清单 | 不影响业务运行时 |

## 5. 接口、数据与状态设计

- `change.yaml.artifacts.design_review: true` 是新 schema v2 的可选 manifest 字段。
- `design-review.md` 不加入 `CORE_CHANGE_FILES`，在 `buildContext.optional_files` 中暴露。
- `design.md`、`design-review.md`、`README.md`、`decisions.md` 和 `release.md` 的事实关系由模板和 skill 约束，不新增 CLI 状态机或 gate 类型。
- schema v1 和未设置该字段的旧 schema v2 不生成评审文件，保持原有五/六文件兼容。

## 6. 异常、幂等、并发与事务

没有运行时并发、网络、事务或资金链路。模板缺失时沿用 `createChangeFiles` 的 `TEMPLATE_INVALID` 快速失败；评审文件存在性和 clarification 阶段模板一致性由严格校验失败暴露。重复执行 change 创建仍由既有 `CHANGE_EXISTS` 保护。

## 7. 兼容、灰度与代码级回滚约束

实际发布配置、环境差异、执行顺序、监控与操作回滚写入 [`release.md`](./release.md)，本节只说明技术方案中的兼容和代码级约束。

实现回滚只需恢复 `src/files.js`、`src/change-service.js`、模板和提示文档的发布源版本。已有旧 change 不依赖新字段；已有新 change 中的评审文件作为普通历史文件保留。

## 8. 测试设计

单元测试覆盖新 schema v2 默认产物、旧 schema v2 无标记、schema v1、严格 clarification 校验、intake 生成和 Delta/Major 受影响文档。工作区检查覆盖模板清单、Markdown 链接、YAML、npm package 内容。消费者 smoke 覆盖 `init` 后 `change new` 生成评审文件；没有业务运行时、RPC、数据库或压测场景。

## 9. 风险、替代方案与未决项

- 风险：两份文档事实漂移。控制方式是 `design.md` 权威声明、共同关键事实摘要、设计命令同步要求和人工 design review gate。
- 风险：消费者尚未执行 `devix update` 时仍使用旧模板。控制方式是发布后 smoke 和既有 update managed path；旧模板下的旧 change 继续可读。
- 替代方案：把 `design-review.md` 加入核心文件或升级 schema。未采用，以避免旧 change 迁移和核心文件集合兼容成本。
- 未决项：无产品或技术方案未决项；发布负责人仍需确认 release readiness。

## 10. PRD 覆盖检查

| PRD 项 | 状态（已回答/部分/未回答） | 方案位置 | 缺口 |
|---|---|---|---|
| 双版本默认产出 | 已回答 | 第 3、5 节 | 无 |
| AI 版权威关系 | 已回答 | 关键事实摘要、第 3、5 节 | 无 |
| 人工版独立评审 | 已回答 | 第 3 节、`design-review.md` | 无 |
| 旧 change 兼容 | 已回答 | 第 4、5、7 节 | 无 |
| Delta/Major 同步 | 已回答 | 第 3、4 节 | 无 |
| 一致性检查边界 | 已回答 | 关键事实摘要、第 3、9 节 | 不实现自然语言语义 diff |
