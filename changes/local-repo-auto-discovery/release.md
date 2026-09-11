# 发布说明

- 发布影响：需要发布
- 判断依据：将修改 Devix CLI 的仓库发现/初始化行为、工作空间模板、安装导览和自动化测试；消费者需要通过 `devix update` 获取新能力。
- 确认状态：待确认

## 发布范围

- 发布制品：`kspay-devix` CLI npm Git 包及其工作空间模板/安装文档。
- 不涉及业务仓库代码、远程配置、数据库、缓存、任务或 RPC。
- 兼容策略：保留现有远程 `devix repo add`，新增本地发现入口。

## 环境与动作

| 环境 | 部署前 | 部署中 | 部署后/验证 |
|---|---|---|---|
| Staging | 在临时工作空间把本地 Git 仓库放入 `repos/`，执行 `/devix-analyze` 触发发现 | 安装候选 CLI 包 | 检查 `repositories.yaml` 仅新增未加载条目且无 clone/checkout；重复执行 analyze 不覆盖已有条目 |
| PRT | 使用发布候选版本运行完整测试和工作区检查 | 发布 npm Git 包对应提交 | 验证既有远程 `repo add` 回归及本地发现幂等性 |
| Prod | 确认版本、变更文档和回滚提交 | 推送 GitHub `main`，消费者执行 `devix update` | 观察首次 `/devix-analyze` 的发现输出；异常时保留旧 CLI current 指针 |

## 回滚

- CLI 回滚：使用 `devix update` 指向上一发布提交，或恢复旧的稳定 current 指针。
- catalog 回滚：删除自动发现写入的本地 `repositories.yaml` 条目；不修改 `repos/` 下仓库内容。

> 确认为无发布影响时，只保留上面的精简结论并删除本说明。确认为有发布影响时，按照 [`standards/release.md`](../../standards/release.md) 增加通用发布内容，并且只展开本需求真实涉及的配置或组件；不得保留无关组件标题、空表格或占位章节。
