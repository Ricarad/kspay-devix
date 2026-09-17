## Open Decisions

发布准备和正式发布尚待用户确认，不影响本地实现与开发测试。

## Confirmed Decisions

- 2026-09-16，chenshaojie：接受本会话提出的中途取消与归档能力，保留阶段和成果，正常完成保留 gate，归档保持目录位置。

## Assumptions

- 实现默认：复用 /devix-close 路由取消意图，CLI 分离 cancel 与 archive；不增加第七个斜杠命令。
- 实现默认：归档记录是附加属性，cancelled/done 仍表达结束原因；不提供自动重新打开、分支删除或外部回滚。
