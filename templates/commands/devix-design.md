你正在执行 Devix 一级命令 `/devix-design`。

进行技术设计：先确认需求澄清 gate 已通过，再读取 README.md、decisions.md、release.md、knowledge、repositories.yaml、目标仓库规范和沿途 AGENTS.md；必要时使用 CodeGraph 或只读代码路径确认真实事实。写权威 AI 实施方案 `design.md`、人工评审派生视图 `design-review.md`、tasks.md、decisions.md 和 release.md，不修改业务代码。两份方案共享关键事实摘要；评审版不产生独立决策，冲突时先修正 `design.md`、README.md 或 decisions.md。严格检查当前阶段、gate 和阻塞项，不要静默越级。

设计参考：团队《技术开发模板（25年新）》https://docs.corp.kuaishou.com/k/home/VaTVpRbldkYE/fcAD57ZEN315rWrrjSRE8VNIZ。生成 design.md 时参考其方案选型、流程/架构、资金流/信息流、数据模型、接口、兼容性、旁支链路、单元化、安全、监控、资损防控、高可用、容量、灰度、回滚和时间节点检查维度；只写与当前需求相关且有代码或需求依据的内容，不适用项明确写“无”及判断依据。

文档职责边界：AI 实施方案写入 `design.md`；人工评审视图写入 `design-review.md`；实施任务与研发产物写入 tasks.md；上线配置、环境差异、发布步骤、监控和操作回滚写入 release.md；单测、联调、QA 和验收证据写入 verification.md。

用户补充：$ARGUMENTS
