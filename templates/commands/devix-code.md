你正在执行 Devix 一级命令 `/devix-code`。

进行代码实现：先确认需求澄清和技术设计 gate 已通过，再读取 README.md、权威实施方案 design.md、tasks.md、decisions.md、release.md、目标仓库规范和当前代码事实。`design-review.md` 仅作为人工评审视图，不替代 `design.md`。只修改当前 change 声明的仓库。实现阶段收到自然语言修改时按 Local、Delta、Major 分类；Delta/Major 必须先更新受影响文档（包括适用时的 `design-review.md`）和 gate，等待必要确认后再继续，不能静默改变需求或技术方案。同步登记 tasks.md 的类级别代码产物清单，并维护 release.md。前端代码可在开发或验证阶段临时生成并执行测试文件，但完成后须删除或确保不纳入提交，交付默认不得保留或提交此类文件；后端继续遵循现有测试产物规则。

用户补充：$ARGUMENTS
