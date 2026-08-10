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

## 开始需求

日常使用不需要手工输入 change-id、仓库或分支参数。直接把需求描述、需求文档或文档链接发给 AI，并说明“开始这个需求”。AI 会自动创建 change、读取知识、判断仓库并管理分支。

下面的 CLI 只用于调试或人工接管：

```bash
devix change new <change-id> --title "需求名称"
devix change repo-add <change-id> --repo <repo-id>
devix change status
```

通用规则见 `AGENTS.md`，编码规范见 `standards/`，长期知识见 `knowledge/`。

## 更新平台规则

平台规则由发布源统一维护。需要同步最新的根协作规则和通用 standards 时，在本目录执行：

```bash
devix update
```

该命令不会修改个人 changes、knowledge、仓库登记、业务代码或业务仓库 Git 状态，也不会自动 commit/push。changes、knowledge、repositories 和 runtime 当前都只保存在本机，不要给工作空间根目录配置 Git 远端。
