# 简化本地仓库接入与自动初始化

## 当前状态

- 阶段：以 `change.yaml.phase` 为准
- 状态：以 `change.yaml.status` 为准
- 下一步：以 `change.yaml.next_action` 为准

## 目标与范围

降低首次接入业务仓库的认知和输入成本。用户可以先把已有的本地 Git 仓库放入 Devix 工作空间，用户执行 `/devix-analyze` 开始需求时，Devix 扫描工作空间 `repos/` 下的直接子目录并自动识别、登记尚未加载的本地仓库，而不要求用户手工填写 Git URL、仓库 ID 和基线分支。识别流程以 `repositories.yaml` 中的 `id` 或 `local_path` 判断仓库是否已经加载；已加载仓库保持原登记，不重复写入或覆盖。现有 `devix repo add <repo-id> --url <git-url> --base <branch>` 作为显式、可重复的高级入口保留。首版只处理工作空间内可明确识别的本地 Git 仓库，不扫描任意上层目录，也不改变业务仓库自身的 Git 历史。

## 原始输入与背景

用户认为 `devix repo add kspay-promo --url <git-url> --base master` 对已有本地代码的使用者过于复杂，希望支持手动将本地仓库拷入工作空间，并在 `install` 或开始需求开发时自动检测和初始化。原始参考截图见 `change.yaml.sources`。

## 当前实现核对

- 当前 `devix repo add` 强制要求 `--url`，并通过 `git clone` 创建 `repos/<repo-id>`。
- 当前 `devix install` 只创建空的 `repos/` 目录，不扫描其中的本地仓库。
- 当前 `devix repo list` 只读取已经写入 `repositories.yaml` 的条目，不负责发现目录。
- 当前需求 intake/仓库解析不会自动登记 `repos/` 下尚未配置的 Git 仓库；`/devix-analyze` 是计划中的用户可见触发入口，CLI intake 是其内部调用链。

## 成功标准

- 用户把已有 Git 仓库放入 `repos/` 后，可以通过一次自动检测完成本地登记，不必提供远程 URL，也不触发 clone。
- 自动登记结果包含稳定的仓库 ID、本地路径和可用分支信息；无法可靠推断时明确提示，而不是静默生成错误配置。
- 用户完成 `install` 后把仓库放入 `repos/`，执行 `/devix-analyze` 开始新需求时自动扫描并登记这些本地仓库；通过 `repositories.yaml` 判断是否已加载，重复检测是幂等的，不覆盖用户已有登记。
- 原有显式 `repo add`、`repo list`、change 仓库关联和现有工作空间保持兼容。

## 包含范围

- 约定本地仓库目录及其 Git 仓库识别规则。
- 在 `/devix-analyze` 进入需求澄清、调用 CLI intake/仓库解析前触发幂等自动发现，并把新发现结果写入 `repositories.yaml`；如 `install` 时已有仓库，可复用同一发现逻辑，但不要求 `install` 扫描非空目录。
- 自动发现只登记本地路径和 Git 状态，不要求远程 URL，不执行 clone。
- 对多仓库、重复登记、无远程仓库和无法判断分支的提示与兼容处理。
- 更新安装导览、工作空间 README、CLI 帮助和自动化测试。

## 不包含范围

- 不扫描工作空间父目录、用户 home 或任意磁盘路径。
- 不自动 clone、pull、push、切换业务仓库分支或修改业务代码。
- 不扫描 `repos/` 之外的路径，也不替用户猜测存在歧义的仓库归属。
- 显式 `devix repo add` 是否继续作为远程 clone 高级入口，作为兼容性问题单独处理。

## 角色与业务场景

- 首次使用者：已在本机拥有一个或多个业务 Git 仓库，希望复制到 `repos/` 后直接开始需求。
- 已初始化工作空间的使用者：新增本地仓库后，希望下一次开始需求时自动被识别。
- 高级使用者/自动化脚本：继续使用显式 `repo add` 精确指定远程地址、仓库 ID 和基线分支。

## 验收标准

| ID | 场景 | Given | When | Then | 验证方式 |
|---|---|---|---|---|---|
| A1 | 本地接入 | `repos/` 下存在未登记的 Git 仓库 | 执行 `/devix-analyze` 开始新需求 | Devix 扫描仓库并登记，不要求远程 URL 或 clone | Agent/CLI 集成测试 |
| A2 | install 后接入 | 工作空间已由 `install` 初始化，用户随后把仓库放入 `repos/` | 执行 `/devix-analyze` 开始首次需求 | 自动发现完成登记 | Agent/CLI 流程测试 |
| A3 | 幂等检测 | 仓库已经登记或其 `local_path` 已存在于 `repositories.yaml` | 重复执行 `/devix-analyze` | 判断为已加载，不重复写入、不覆盖现有登记 | 单元测试 |
| A4 | 信息不足 | 本地仓库无远程或基线分支无法可靠判断 | 执行自动发现 | 保留可识别信息并给出可操作提示，不生成错误远程配置 | 单元测试 |
| A5 | 显式兼容 | 使用现有 `repo add` 参数 | 添加仓库 | 行为和现有工作空间保持兼容 | 回归测试 |

## 关键结论与待确认项

- 推荐自动发现目录为工作空间内 `repos/` 的直接子目录；不接受任意外部路径自动扫描。
- 推荐主要触发点为用户执行 `/devix-analyze` 时，在 CLI intake/仓库解析前完成；`install` 保持目标目录必须为空的现有约束。
- 推荐仓库 ID 默认取目录名；自动发现只登记本地路径和 Git 状态，不要求远程 URL。
- “已加载”定义为候选仓库的 `id` 或 `local_path` 已存在于 `repositories.yaml`；已加载条目不重新推断分支、不刷新远程地址、不覆盖用户配置。

待确认项已列在 [`decisions.md`](./decisions.md)，当前只剩已有 catalog 条目的保护策略需要设计评审确认。

> 未确认内容只能标为待确认或假设。复杂需求可增设 `decisions.md`。

## 文档入口

| 文件 | 用途 |
|---|---|
| [`change.yaml`](./change.yaml) | 状态、gate、仓库与分支 |
| [`README.md`](./README.md) | 需求澄清、范围、验收标准和关键结论 |
| [`design.md`](./design.md) | 技术方案 |
| [`decisions.md`](./decisions.md) | 待决策项、确认决策与假设（structured change） |
| [`tasks.md`](./tasks.md) | 实施任务与进度 |
| [`release.md`](./release.md) | 发布配置、环境差异、上线 SOP、监控与回滚 |
| [`verification.md`](./verification.md) | 单测、联调与最终验证证据 |

## 事实落档与恢复规则

- 已确认变化先落档、清理冲突旧描述，再继续编码：需求与验收写本文件，技术方案写 `design.md`，已确认取舍写可选的 `decisions.md`，任务进度写 `tasks.md`，发布配置与上线 SOP 写 `release.md`，状态与恢复摘要写 `change.yaml`，测试与验收证据写 `verification.md`。
- 当前 change 禁止使用任何跨会话 memory 作为临时中转、正文备份、事实来源或恢复入口。
- `change.yaml.resume.context_summary` 只提供简洁恢复摘要和文档入口，不能替代正式方案。
- 上下文压缩、新会话、暂停、切换或交接前，检查所有 change 文件内容一致；新会话只从这些文件、登记的知识来源和当前代码事实恢复。

## Intake 记录

用户希望简化 devix repo add kspay-promo --url <git-url> --base master。用户本地通常已经有业务代码仓库，希望可以手动把本地仓库放入工作空间，由 Devix 自动识别和登记，或者在执行 install 或开始需求开发时自动检测并初始化仓库，减少用户手工填写仓库 URL、ID 和基线分支的步骤。请评估合理的自动发现时机、识别规则、配置生成和兼容性。

## 澄清补充记录

用户确认自动识别的用户可见触发点为 `/devix-analyze`：执行需求澄清时扫描 `repos/` 下每个直接子目录，并通过 `repositories.yaml` 的 `id` 或 `local_path` 判断是否已经加载；已加载仓库不重复写入或覆盖。CLI intake/仓库解析作为该命令的内部调用链保留。
