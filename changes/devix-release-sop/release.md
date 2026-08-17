# 发布说明

## 1. 发布影响与范围

- 发布影响：需要发布 Devix CLI、协作规则和 change 模板。
- 发布制品：`kspay-devix` npm Git 包。
- 发布目标：GitHub `main`。
- 消费方式：使用者在工作空间执行 `devix update`。

## 2. 发布前动作

| ID | 动作 | 前置条件 | 状态 | 证据 |
|---|---|---|---|---|
| PRE-1 | 运行全部自动化测试和工作区检查 | 实现完成 | done | 22 tests、WORKSPACE_OK、PACKAGE_OK |
| PRE-2 | 执行 npm 打包边界检查 | PRE-1 | done | npm pack dry-run：0.5.0，32 files |
| PRE-3 | 确认不包含 `my-devix` 修改 | PRE-1 | done | Git diff 仅位于 kspay-devix 发布源 |

## 3. 发布步骤

| ID | 动作 | 前置条件 | 状态 | 证据 |
|---|---|---|---|---|
| REL-1 | 提交 0.5.0 变更 | 发布准备门禁通过 | pending | 待补充 |
| REL-2 | 推送 GitHub `main` | REL-1 | pending | 待补充 |

## 4. 发布后验证

| ID | 动作 | 状态 | 证据 |
|---|---|---|---|
| POST-1 | 确认本地 HEAD 与 `origin/main` 一致 | pending | 待补充 |
| POST-2 | 向用户提供 `devix update` 使用说明 | pending | 待补充 |

## 5. 回滚

- GitHub 保留上一版本提交，必要时发布修复提交；不重写远端历史。
- `devix update` 不修改已有 changes，消费者可继续使用更新前的已有规格文件。
