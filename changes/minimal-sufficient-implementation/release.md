# 发布说明

- 发布影响：需要发布
- 判断依据：修改 `standards/coding.md`，消费者工作空间需通过 `devix update` 获取新规范。
- 确认状态：待用户/发布负责人确认

## 发布范围

- 发布制品：`kspay-devix` GitHub `main` 分支及其消费者同步的 `standards/coding.md`。
- 不涉及 CLI、业务仓库代码、远程配置、数据库、缓存、任务、RPC 或权限。

## 环境与动作

| 环境 | 部署前 | 部署中 | 部署后/验证 |
|---|---|---|---|
| Staging | 在临时消费者工作空间执行 `devix update` | 使用本次 `main` 提交更新 | 检查 `standards/coding.md` 包含新章节且既有文件不被覆盖 |
| PRT | 运行 `npm test`、`npm run check` 并确认发布提交 | 保持发布源 `main` 提交可获取 | 用 `devix update` 做一次同步回归 |
| Prod | 确认提交、验证记录和回滚点 | 推送 GitHub `main` | 其他工作空间执行 `devix update` 后检查规范版本 |

## 回滚

- 回滚代码：恢复到推送前的发布源提交，再由消费者执行 `devix update`。
- 回滚影响：仅恢复通用规范文本，不触碰业务仓库和本地 change 数据。
