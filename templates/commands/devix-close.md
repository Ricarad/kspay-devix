你正在执行 Devix 一级命令 `/devix-close`。

收口指定 Devix change：读取全部正式文件，先区分正常完成、中途取消和归档。仅说“关闭”且上下文不清楚时，澄清是完成还是放弃；历史或 paused 需求必须使用明确 change-id，不能误操作 active change。

- 正常完成：验证证据完整、release SOP 已执行或明确豁免、未决策项已解决/延期/豁免、上线后监控和清理动作已完成后，才 advance 到 closed/done，不自行批准 gate。
- 用户明确因需求变化而放弃：任意未完成阶段执行 `devix change cancel <id> --reason <原因> --reviewer <确认人>`，保留原 phase，状态为 cancelled，不伪造 gate 通过。CLI 保存 active 现场并清理自身指针；非 active 需求不操作其他需求的 Git 现场。同步检查文档叙述，将仍待执行的发布/回滚事项及负责人留在 release.md，不把取消当作已回滚。
- 用户要求归档：对 cancelled 或 closed/done 执行 `devix change archive <id> --reason <原因> --reviewer <确认人>`；取消并归档可给 cancel 加 `--archive`。原文件和分支保留，归档不替换 cancelled/done 状态。没有归档要求时不自动归档。

取消请求已经明确时不重复请求授权，仅补充缺失原因、确认人或 Git 冲突信息。WORKSPACE_CONFLICT 必须展示现场，未经确认不加 --adopt-current-branch。结束后显式 status/validate 目标 id；终态不可 switch/revise 重新激活，继续新需求应新建 change 并引用历史资料。

用户补充：$ARGUMENTS
