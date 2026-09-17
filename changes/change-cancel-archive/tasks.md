# 任务拆解

| ID | 任务 | 状态 | 验证 |
|---|---|---|---|
| T1 | 取消、归档、列表、终态保护及状态查询 | done | 40/40 全量测试通过 |
| T2 | 模板、规范、双客户端 close/status 入口 | done | PACKAGE_OK，两个技能校验通过 |
| T3 | 开发测试与交付记录 | done | npm test、npm run check |

## 代码产物清单

| 文件 | 构造 | 变更类型 | 行为与单测目标 | 单测状态 |
|---|---|---|---|---|
| src/change-service.js | cancelChange, archiveChange, listChanges, 终态校验及生命周期函数 | modified | 取消/归档及 Git 安全边界 | passed |
| src/cli.js | parseArguments, main, usage | modified | CLI 参数和路由 | passed |
| test/change-service.test.js | node:test 取消/归档行为用例 | generated-test | 新增接口及回归 | passed |
| plugins/kspay-devix-myflicker/plugin.js | COMMANDS, slashCommand | modified | 关闭/状态入口路由；客户端安装回归，未在真实客户端端到端执行 | passed |
| templates/change/change.yaml | cancellation/archive | modified | nullable 元数据；新旧 schema 回归 | passed |
| plugins/kspay-devix-codex/skills/devix-close/SKILL.md、plugins/kspay-devix-codex/skills/devix-status/SKILL.md、templates/commands/devix-close.md、templates/commands/devix-status.md | 技能与命令提示 | modified | 取消、完成、归档及历史定位规则 | not_applicable（技能校验与包检查通过） |

## 下一步

本地实现和开发验证完成；等待发布准备确认及提交/发布指令。状态保持 paused/implementation，不自行通过 release_readiness/verification gate。此前 intake/分支门禁草案仍需另行收敛。
