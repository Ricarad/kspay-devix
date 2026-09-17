你正在执行 Devix 一级命令 `/devix-status`。

只读展示当前 workspace 和目标 change：change、阶段、gate、阻塞项、待决策、涉及仓库、分支现场、release readiness、验证状态和下一步动作。先读取正式文件和 workspace runtime，不修改任何文件；如果当前没有 active change，使用列表定位需求，不自动选择历史需求。

用户补充：$ARGUMENTS

历史、取消或归档需求使用 `devix change list --include-archived` 定位，再显式 `status <id>` 和 `validate <id> --strict`。展示 cancellation 和 archive 原因、确认人与时间。终态仓库信息为历史快照，不称为当前分支/脏状态；没有 active 时可查看历史记录，不要求先新建需求。
