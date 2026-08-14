# 多仓库与分支管理

## 1. 目录与状态边界

- `repos/<repo-id>/`：默认代码仓库目录，每个业务仓库维护自己的 Git。
- `.worktrees/`：仅为显式并行场景保留，不是默认模式。
- `changes/<change-id>/change.yaml`：本机保存的需求分支和恢复状态，当前不初始化独立 Git。
- `.devix/runtime/workspace-state.yaml`：本机 active change 指针。

消费者工作空间根目录不是 Git 仓库，也不应配置 Git 远端；`changes/`、`knowledge/`、仓库登记和 runtime 当前都只保存在本机。业务仓库保持独立 Git 历史。Devix 不使用 submodule，不自动 fetch、pull、push、stash 或 reset，也不自动提交工作空间状态文件。

仓库路径优先通过索引解析，不扫描文件系统：当前需求先读 `change.yaml.repositories`，工作空间已登记仓库再读根 `repositories.yaml`；需要绝对路径和实际 Git 状态时使用 `devix repo list`。README 和 AGENTS 只在路径确定后用于理解职责和规范，不承担路径索引职责。

## 2. Change 仓库声明

```yaml
repositories:
  - id: kspay-promo
    local_path: repos/kspay-promo
    base_branch: master
    feature_branch: feature/example-change
    workspace_mode: checkout
    worktree_path: ""
    modules:
      - kspay-promo-runner
    start_ref: <base commit>
    last_known_head: <resume commit>
    snapshot:
      kind: clean_head | wip_commit
      commit: <resume commit>
      created_at: <time>
```

`modules` 用于恢复时查找从仓库根到目标模块沿途的 AGENTS。`last_known_head` 是恢复校验点，不能用来自动 reset 分支。

## 3. 两阶段切换

### 阶段 A：预检和快照

先读取所有涉及仓库的实际 branch、HEAD、tracked/untracked 修改：

- 实际分支等于 `feature_branch`：允许继续。
- dirty feature branch：自动 `git add -A`，创建仅本地 WIP commit，不 push。
- 分支不符、detached HEAD、脏 main/master：返回 `WORKSPACE_CONFLICT`，包含预期/实际分支、HEAD 和修改文件，等待确认。
- 任一仓库预检失败：任何仓库都不开始 WIP commit。
- commit hook 失败：不开始 checkout，active change 保持不变；已 stage 的文件留在现场供开发者检查。

所有快照完成后，逐仓库更新 `last_known_head/snapshot`，再把 change 标为 paused。

### 阶段 B：目标分支激活

先验证全部目标仓库干净、目标或基线分支存在，并核对目标分支 HEAD 与 `last_known_head`。通过后才统一 checkout；中途 checkout 失败时把已经切换的仓库退回原分支，不 reset 提交。

切换成功后对存在 `.codegraph/` 的当前仓库目录执行 sync。sync 失败不回滚已完成的分支切换，但返回 `CODEGRAPH_SYNC_FAILED`，明确禁止使用陈旧索引。

## 4. CLI

```text
devix change new <id> --title <标题> [--repo <repo-id[:base-branch]>]
devix change switch <id>
devix change pause
devix change repo-add <id> --repo <repo-id[:base-branch]>
devix change status [id]
devix change validate <id>
devix change advance <id> --to <phase>
```

`new` 在修改 active change 前先验证 change-id、目录冲突和仓库参数。仓库路径默认是 `repos/<repo-id>`，feature branch 默认是 `feature/<change-id>`；仓库有更具体规则时，应先更新 change.yaml 再进入实现。

需求澄清后才确定影响仓库时，使用 `repo-add`。目标 change 是 active 时，CLI 会预检新增仓库、创建/切换 feature branch 并同步 CodeGraph；目标 change paused 时只登记清单，待下次 switch 统一激活。

发现分支偏差后，只有用户明确确认采用实际普通功能分支时，才可重试并传 `--adopt-current-branch`。该参数不允许接管 main/master 或 detached HEAD。
