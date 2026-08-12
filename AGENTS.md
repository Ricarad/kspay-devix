# kspay-devix 协作规则

本文件适用于整个 Devix 工作区。进入 `repos/` 中的业务仓库后，必须读取从该仓库根目录到目标代码目录沿途所有适用的 `AGENTS.md`。

对于编码风格、工程结构、构建方式、测试方式等仓库内开发规范，优先级为：

1. 目标代码所在目录最近一级的 `AGENTS.md`。
2. 该业务仓库上层目录的 `AGENTS.md`，越具体越优先。
3. Devix `standards/` 中的通用规范，仅补充业务仓库没有规定的部分。

Devix 的需求状态、评审 gate、多仓库现场安全仍由本文件和当前 change 约束。若业务仓库规范与已确认的功能需求发生实质冲突，先记录冲突并请求确认，不能用任一侧静默覆盖另一侧。

## 开始任何需求前

1. 若 `.devix/runtime/workspace-state.yaml` 存在，读取它确认当前激活的 change，并核对唯一的 `changes/<change-id>/change.yaml`；不存在表示尚未激活 change。
2. 读取该需求的 `README.md`、`design.md`、`tasks.md`、`verification.md`，以及存在时的 `decisions.md`。
3. 读取 `change.yaml.repositories` 涉及的仓库清单，不凭目录名猜测影响仓库。
4. 对每个涉及的仓库，先读取仓库根目录及目标模块沿途适用的全部 `AGENTS.md`，整理仓库特定的代码、构建和测试要求。
5. 再读取 `standards/`，只用它补齐仓库规范未覆盖的部分，不反向覆盖仓库规则。
6. 如果当前代码工作目录存在 `.codegraph/`，第一次理解或定位代码前必须先对该目录执行 `codegraph sync`，同步成功后优先使用 CodeGraph；不可用时再使用文本搜索并说明边界。

## 阶段约束

- `clarification`：只整理原始需求、范围、术语、验收标准和待确认项；完成后定向读取知识库。
- `design`：允许只读代码勘察，记录真实调用链、影响仓库和未验证假设，更新技术方案与任务拆解；不得开始工程实现或构建，除非用户明确要求验证性原型。
- `implementation`：只有需求澄清、知识读取和技术方案评审 gate 通过后才能修改业务代码。
- `verification`：按验证计划提供单测、联调、回归、发布命令和结果证据，不能把“未运行”写成“通过”。
- `closed`：验证 gate 通过，恢复摘要和可复用知识已经收口。

AI 不得自行把需要产品、架构师、仓库负责人或用户确认的 gate 标记为 `passed`。用户明确确认后，才同步更新 `change.yaml` 与 `decisions.md`。

## Change 控制

- 用户发来一段新需求描述、需求文档、本地文件或文档链接并表达“开始需求/开始开发”时，视为新 change 入口。不得要求用户提供 change-id、英文标题、仓库 ID、分支名或 CLI 参数。
- AI 从需求语义生成简洁的 change-id 和标题，先用 `devix change status` 检查 active change，再在内部调用 `devix change new`。原始文件路径/链接写入 `change.yaml.sources`，原始描述和结构化澄清写入 README。
- 新 change 初始不要求用户指定代码仓库。完成初步澄清后，先读取 knowledge 和 `repositories.yaml`，结合需求关键词、仓库 AGENTS 与必要的只读代码勘察判断影响仓库，再由 AI 内部调用 `repo-add`。
- 只有需求目标、范围或验收标准存在会改变方案的关键歧义时才询问用户；能从需求文档、知识库、仓库配置或代码中查明的信息不得反问用户。
- 用户要求切回历史需求时，使用 `devix change switch <id>`，不能只手工 checkout 代码分支而不更新 active change。
- CLI 返回 `WORKSPACE_CONFLICT` 时，向用户展示预期/实际分支、HEAD 和修改文件并请求确认；未确认前不得重试带 `--adopt-current-branch` 的命令。
- 激活成功后，读取 CLI 输出的核心文件、可选文件、AGENTS、知识来源、下一步和 CodeGraph 状态，恢复工作上下文。
- Devix 不自动 commit 或 push 工作空间文件；消费者根目录和 `changes/` 当前都不初始化 Git，需求共享方案后续单独设计。

## 发布源与使用端

- `kspay-devix` 源码仓库是 Devix 平台规则和 CLI 的唯一发布源；通用 `AGENTS.md`、`standards/` 和 CLI 能力只在发布源修改、验证、提交并发布。
- `my-devix` 等消费者工作空间不得手工同步修改平台托管文件；在工作空间根目录执行 `devix update` 从 GitHub `main` 更新 `AGENTS.md` 和 `standards/`。
- `devix update` 不覆盖 `changes/`、`knowledge/`、`repositories.yaml`、`repos/` 或 `.devix/runtime/`，也不自动 commit 或 push。
- 消费者工作空间根目录不是 Git 仓库，`devix install/init` 不执行 `git init`；当前也不为 `changes/` 初始化独立 Git。业务仓库仍只在 `repos/<repo-id>` 中维护各自 Git。

## CodeGraph 索引与代码读取

- CodeGraph 必须针对当前实际代码目录运行：默认 checkout 模式使用 `repos/<repo-id>`；显式启用 worktree 时才使用 `.worktrees/<change-id>/<repo-id>`。不能拿其他目录或分支的索引分析当前代码。
- checkout、创建/切换 worktree、pull、rebase 或其他会改变 HEAD 的操作后，在第一次代码分析前执行 `codegraph sync <path>`。
- 完成一批代码修改后，在使用 `impact`、`affected`、调用链或最终代码复核前再次执行 sync。
- 同步成功后，先用 `codegraph explore` 获取相关符号源码和调用路径，再按需用 `node`、`callers`、`callees`、`impact`、`affected` 深挖；结果不足时才使用 `rg` 和直接读文件补充。
- `.codegraph/` 不存在时不得擅自执行 `codegraph init`；记录“未建立索引”，按仓库约束决定是否请用户建立索引。
- sync 失败时不得把旧索引结果当成当前分支事实；明确报告失败、索引可能陈旧及所采用的替代检索方式。

## 文档事实边界

- `change.yaml`：当前阶段、生命周期状态、仓库/分支、gate、阻塞项、下一步。
- `README.md`：需求目标、范围、场景、验收标准、关键结论和未决问题。
- `design.md`：基于真实代码路径的技术方案、数据/接口/兼容/回滚设计。
- `decisions.md`（可选）：复杂需求已经确认的选择、负责人、日期和依据；假设不能伪装成决策。
- `tasks.md`：可执行任务、依赖、状态和验证方式。
- `verification.md`：测试矩阵、命令、环境、结果、发布证据与未覆盖项。

同一事实出现冲突时，先停止推进并显式消歧，不能静默选择对自己方便的版本。

## Change 事实落档与跨会话恢复

- 当前 change 的事实必须落在该 change 的正式文件中：需求与验收变化写入 `README.md`，技术链路、接口和实现方案变化写入 `design.md`，已确认的关键取舍写入 `decisions.md`，任务状态、阻塞和下一步写入 `tasks.md`，阶段、状态、仓库分支和恢复摘要写入 `change.yaml`，测试与交付证据写入 `verification.md`。
- 未确认的方案只能在 `README.md` 或 `design.md` 中标记为假设或待确认项，不能提前写成 `decisions.md` 中的已确认决策。
- 用户确认方案或代码事实发生变化后，必须先更新全部受影响的 change 文件并清理相互冲突的旧描述，再继续编码、验证或切换任务；不能只追加新结论而保留已经失效的旧方案。
- `change.yaml.resume.context_summary` 只保存简洁的恢复摘要和文档入口，不能承载完整方案，也不能替代 `README.md`、`design.md`、`decisions.md` 或 `tasks.md`。
- 当前 change 完全禁止写入、更新、查询或依赖任何跨会话 memory；memory 不能作为临时中转、正文备份、事实来源或恢复入口，也不得建议用户“先存 memory 再开新会话”。
- `knowledge/` 只沉淀已经验证、与单一 change 无关且可跨需求复用的知识，不能代替当前 change 的事实落档。
- 在预计上下文压缩、准备新会话、暂停或切换 change、工作交接以及结束当前工作前，必须检查 `change.yaml`、五个核心文件和存在时的 `decisions.md` 是否一致，确保阶段、下一步、阻塞、任务状态、方案与验证证据互相匹配。
- 新会话恢复当前 change 时只以该 change 的正式文件、其登记的知识来源和当前代码事实为依据。发现文件之间存在冲突时先停止开发并消歧，不得用旧会话或 memory 静默补全。

## 代码生成

- 只修改当前需求 `repositories` 声明的仓库；扩大范围前先更新影响面并获得必要确认。
- 先沿真实调用链阅读，再决定新增抽象；优先复用仓库已有模式，不机械复制参考实现。
- 代码写法、注释风格、构建和测试命令优先遵守目标业务仓库的 `AGENTS.md`；[`standards/coding.md`](./standards/coding.md)、[`standards/comments.md`](./standards/comments.md) 和 [`standards/testing.md`](./standards/testing.md) 仅作为缺省规则。
- 类头禁止过程性或描述性注释；仓库没有更具体规则时，只保留 `@author 姓名 <邮箱>` 和 `Created on YYYY-MM-DD`。
- 生码和验证完成后不自动 commit 或 push；先汇报结果，只有用户明确要求提交时才创建正式 commit。
- 不自动 stash、不覆盖用户已有修改。
- 每次交付都说明修改文件、验证命令、验证结果、未验证项与剩余风险。

## 分支与现场安全

- 分支映射以 `change.yaml.repositories` 为准。
- 切换需求前先检查实际分支、HEAD 和工作区是否干净。
- 默认直接在 `repos/<repo-id>` 中 checkout 需求对应的 feature branch；完成切换后立即对该目录执行 CodeGraph sync（存在索引时）。
- 实际分支符合 change 清单时，工作区不干净则允许 Devix 自动 `git add -A` 并创建本地 WIP commit；不自动 push 或 stash。
- 上述 WIP commit 只用于切换 change 时保存现场，不得作为生码完成后的自动正式提交。
- 实际分支与预期不符、处于 detached HEAD，或脏现场位于 master/main 时，禁止自动 commit 和 checkout；必须展示预期/实际分支、HEAD 与修改文件并请求用户确认。
- worktree 只用于确实需要同一代码仓库并行开发多个需求的场景，必须由 `change.yaml` 显式声明，不作为默认模式。
