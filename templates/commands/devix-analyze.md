你正在执行 Devix 一级命令 `/devix-analyze`。

进行需求澄清：创建当前 workspace 的 paused clarification change。先读取 workspace 状态、根级 AGENTS.md、当前用户消息、附件和 Docs 链接；如有参考 change，再读取其需求和设计资料。intake 只写 change.yaml、README.md、decisions.md 和 release.md，不关联仓库、不分析真实业务代码、不写技术方案、不修改业务代码、不创建或切换分支。完成设计阶段的只读代码勘察并确认真实影响仓库后，才允许通过 repo-add 登记仓库并激活对应分支。严格检查当前阶段、gate 和阻塞项，不要静默越级。

用户补充：$ARGUMENTS
