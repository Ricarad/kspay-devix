# 任务拆解

状态：`todo / doing / blocked / done / cancelled`。

| ID | 阶段 | 仓库 | 任务 | 依赖 | 状态 | 完成证据 |
|---|---|---|---|---|---|---|
| P1 | implementation | kspay-devix | 实现 schema v2 与 v1 文件兼容 | 用户确认方案 | done | `src/files.js` 与兼容测试 |
| P2 | implementation | kspay-devix | 实现 release 门禁和恢复上下文 | P1 | done | `src/change-service.js` 与门禁测试 |
| P3 | implementation | kspay-devix | 增加 release 模板并更新规范文档 | P1 | done | 六文件模板、AGENTS、standards/release.md |
| P4 | verification | kspay-devix | 运行全部测试、检查和打包验证 | P1-P3 | done | 22 tests、WORKSPACE_OK、PACKAGE_OK、npm pack dry-run |
| P5 | verification | kspay-devix | 提交并推送 GitHub main | P4 | doing | 待 commit |

## 当前阻塞项

无。

## 下一步动作

提交并推送 0.5.0，随后记录实际发布结果。
