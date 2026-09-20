# 验证与交付记录

## 1. 验收标准映射

| 验收 ID | 测试层级 | 用例/命令 | 状态 | 证据 |
|---|---|---|---|---|
| A1 | 单元/工作区 | `npm test` | passed | 42/42；覆盖新 v2、旧 v2、schema v1、严格校验和 Delta 文档清单 |
| A2 | 工作区检查 | `npm run check` | passed | `WORKSPACE_OK`、`PACKAGE_OK` |
| A3 | 严格校验 | `node bin/devix.js change validate design-review-artifact --strict --json` | passed | `valid: true` |
| A4 | 消费者 smoke | 临时 workspace 执行 `init` 和 `change new` | passed | 新 change 生成 `design-review.md`，manifest 标记为 true |

## 2. 单元测试

## 3. 集成与回归测试

## 4. 非功能验证

## 5. 发布证据引用

发布配置、环境差异、执行步骤、监控与回滚统一维护在 [`release.md`](./release.md)，这里只引用与验收结论直接相关的证据，不复制发布正文。

## 6. 未运行与未覆盖项

- 尚未执行真实消费者 `devix update` 的远程同步；当前只验证本地发布源初始化和模板生成。
- 尚未执行 Staging/PRT/Prod 发布；`release_readiness` 和 `verification` gate 仍待发布负责人确认。
