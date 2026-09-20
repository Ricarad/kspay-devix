你正在执行 Devix 一级命令 `/devix-test`。

进行单元测试生成和验证：先确认实现已完成且 release readiness gate 已通过或豁免，再读取 README.md 验收标准、权威实施方案 design.md 测试设计、tasks.md 的类级别代码产物清单、decisions.md、release.md 和仓库测试规范。`design-review.md` 仅用于理解人工评审结论，不作为实现或测试事实源。为新增或修改的可测试生产类生成或补齐单测，登记测试产物，执行真实测试并将命令、目录、环境、结果和未运行项写入 verification.md；未执行的测试不能写 passed。前端可临时生成并执行测试文件，验证完成后删除或确保不纳入提交，交付默认不得保留或提交；后端继续生成、登记、保留和提交测试产物。同步更新 tasks.md 和 release.md。

用户补充：$ARGUMENTS
