# 技术设计

## 1. 现状与调用链

- `src/cli.js` 的 `change intake` 调用 `src/change-service.js:intakeChange`。
- `intakeChange` 当前直接调用 `createAndActivateChange`；当没有 `--repo` 时，change 以空仓库清单创建，之后依赖 AI 或人工执行 `change repo-add`。
- `src/repository-service.js:addRepository` 只支持远程 URL，校验后执行 `git clone`，再把 `url`、`local_path` 和 `base_branch` 写入 `repositories.yaml`。
- `listRepositories` 只读取 catalog，不检查 `repos/` 下未登记的目录。
- `src/change-service.js:parseRepoSpec` 已能从本地 `repos/<id>` 读取已登记仓库或通过 `resolveBaseBranch` 推断基线，因此自动发现只需补齐 catalog，不需要改 change manifest 结构。

## 2. 目标行为

### 本地发现

新增 `discoverRepositories(root, options)`，只读取工作空间配置的 `workspace.repos_dir`（缺省为 `repos`）下的直接子目录：

1. 忽略文件、符号链接和目录名不符合仓库 ID 规则的候选项。
2. 对候选目录执行 Git worktree 校验；不是有效 Git 仓库的目录进入 `skipped`，不阻断整个发现流程。
3. 已有相同 `id` 或相同 `local_path` 的 catalog 条目保持不变，保证重复执行幂等且不覆盖用户配置。
4. 新仓库使用目录名作为 `id`，使用相对工作空间的 `local_path`，并通过现有 `resolveBaseBranch` 推断 `base_branch`（优先 `main`、`master`，否则当前分支）。
5. 无法推断基线分支的仓库进入 `needs_confirmation`，返回仓库路径、候选分支和原因；发现流程不静默丢弃，也不写入不完整条目。`repo discover` 直接展示确认请求，需求 intake 将该结果交给当前 AI 会话主动询问用户；用户确认具体分支后重新执行发现并写入 catalog。
6. 新条目不写 `url`，明确表示这是本地仓库；如果仓库已有 `.codegraph/`，复用 `syncCodeGraph`，失败作为该条目的发现失败返回。

返回值包含 `discovered`、`skipped`、`needs_confirmation` 和本次 catalog 中的 `repositories`，便于 CLI 和 intake 记录结果。

### 触发时机

- `intakeChange` 在创建/激活新 change 前调用一次发现服务。发现只更新 `repositories.yaml`，不自动关联仓库、不 checkout 分支、不创建 WIP commit。
- 增加 `devix repo discover` 作为可见的人工检查入口，复用同一服务；它不需要 URL 或其他参数。
- `devix install` 保持目标目录必须为空的现有安全约束。初始化后目录通常尚未有业务仓库，因此不额外改变初始化语义；用户把仓库放入 `repos/` 后，下一次 intake 或显式 discover 即可接入。

### 兼容策略

- `repo add` 保持现有远程 clone 行为，避免破坏已有脚本；安装文档把它标为远程仓库的显式高级入口。
- `repositories.yaml` 保持 schema v1；本地条目只省略 `url`，现有 `parseRepoSpec`、`repo list` 和 change 仓库 manifest 均兼容。
- 自动发现不接管已有条目，即使目录当前状态、分支或远程地址发生变化；用户仍可通过现有显式命令和配置流程处理冲突。
- 发现过程只做读 Git 状态和写 catalog，不执行 clone、pull、push、checkout 或业务提交。

## 3. 影响文件

- `src/repository-service.js`：新增本地仓库发现与 catalog 幂等写入。
- `src/cli.js`：注册 `repo discover`，并在帮助文本中说明本地发现与远程 add 的区别。
- `src/change-service.js`：在 `intakeChange` 创建 change 前调用发现服务。
- `test/change-service.test.js`、`test/workflow-agent.test.js`：覆盖发现、幂等、跳过无效目录、分支确认和 intake 触发。
- `templates/workspace/README.md`、`docs/installation.md`、根 `README.md`：更新本地仓库接入流程。

## 4. 风险、回滚与未验证假设

- 目录名即仓库 ID 的约定可能与用户希望的业务命名不同；冲突时跳过并报告，不自动重命名。
- detached HEAD 或没有 `main`/`master` 且无法取得当前分支的仓库不会自动登记，必须在 install/需求执行过程中向用户请求具体基线分支。
- `repo discover` 写入 catalog 属于本地可逆变更；回滚只需删除对应 catalog 条目，不触碰业务仓库 Git 历史。
- 当前仓库没有 `.codegraph/` 索引，因此本次设计使用文本和测试代码核对调用链，没有执行 CodeGraph。
