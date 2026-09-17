# Devix Workspace

该工作空间保存团队通用规范、知识库和个人 change 规格；它的根目录不是 Git 仓库，业务代码仓库位于 `repos/` 并保持各自独立的 Git 历史。

该工作空间可通过 `devix install <目录>` 或等价的 `devix init <目录>` 生成。

工作空间根目录不是 Git 仓库，`changes/` 当前也不单独初始化 Git。业务代码仓库只在 `repos/` 下保留各自独立 Git。

查看命令：`devix --help`。

## 初始化业务仓库

```bash
devix repo add <repo-id> --url <git-url> --base master
devix repo list
```

`repositories.yaml` 是本工作空间的仓库路径索引。AI 优先从当前 change 的仓库清单和该文件解析路径；需要绝对路径、实际分支或 HEAD 时使用 `devix repo list`，不扫描上层工程目录猜测仓库位置。

## 开始需求

日常使用不需要手工输入 change-id、仓库或分支参数。直接把需求描述、需求文档或文档链接发给 AI，并说明“开始这个需求”。AI 会自动创建 change、读取知识、判断仓库并管理分支。

新 change 会固定生成 `release.md`，用于记录实际涉及的远程配置、Staging/PRT/Prod 差异以及上线前后 SOP；未涉及的组件不会生成空章节。

下面的 CLI 只用于调试或人工接管：

```bash
devix change new <change-id> --title "需求名称"
devix change repo-add <change-id> --repo <repo-id>
devix change status
```

需求中途变化不再继续时，用 `/devix-close` 说明取消原因和是否归档；正常完成仍遵守验证/发布 gate。手工入口：`devix change cancel <change-id> --reason "业务调整" --reviewer "确认人" --archive`。归档保留原文件和分支，状态仍区分 cancelled 与 done。使用 `devix change list --include-archived` 和显式 `devix change status <change-id>` 查询历史；终态不允许重新 switch/revise。

通用规则见 `AGENTS.md`，编码规范见 `standards/`，长期知识见 `knowledge/`。

## 更新平台规则

平台能力由发布源统一维护。需要同步最新 CLI、根协作规则、通用 standards 和新 change 模板时，在本目录执行：

```bash
devix update
```

该命令把 CLI 安装到用户级版本缓存并原子切换稳定启动器，同时更新 `AGENTS.md`、`standards/` 和 `.devix/templates/change/`。它不会修改已有 changes、knowledge、仓库登记、runtime、业务代码或业务仓库 Git 状态，也不会自动 commit/push；模板更新只影响之后创建的新 change。
