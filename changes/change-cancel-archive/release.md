# 发布说明

- 发布影响：required；CLI 和技能/模板需要发布源发布后由消费者更新。
- 准备状态：planning；尚未提交、推送或安装到消费者。

## 环境和 SOP

| 环境 | 动作 | 负责人 | 证据 |
|---|---|---|---|
| Staging | 临时工作空间验证 cancel/archive/list、Git 冲突和现有流程 | Codex | 40/40 测试通过 |
| PRT | 包 dry-run、模板同步回归、技能校验 | Codex | PACKAGE_OK，技能校验通过 |
| Prod | 用户授权后发布源提交和推送；消费者 devix update、必要时 devix agent install | 用户/发布负责人 | 未执行 |

## 上线后与回滚

发布后检查消费者 CLI help 和取消后状态，确认原文件与分支保留。回滚使用上一个版本的 CLI/规则；保留 cancellation/archive 元数据与 cancelled 状态，旧版本缺少终态保护，不使用旧 switch 恢复归档需求。需继续的需求新建 change 并引用历史材料。

## 本地交付记录

2026-09-16：取消/归档 CLI、终态保护、模板和关闭技能实现完成，npm test 40/40、npm run check、技能校验通过；未执行发布。release_readiness 尚未由发布负责人确认，status 保持 planning。
