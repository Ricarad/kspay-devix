# 验证与交付记录

## 1. 验收标准映射

| 验收 ID | 测试层级 | 用例/命令 | 状态 | 证据 |
|---|---|---|---|---|
| A1 | 单元测试 | 新 change 六文件与 schema v2 | passed | `npm test` 用例 1 |
| A2 | 单元测试 | release 模板不生成组件空章节 | passed | `npm test` 用例 1 检查 Kconf/Kconfig/Redis/Task/RPC 不存在 |
| A3 | 单元测试 | verification/closed 发布门禁 | passed | `npm test` 用例 21-22 |
| A4 | 兼容测试 | schema v1 五文件与已有 release 恢复 | passed | `npm test` 用例 2 |
| A5 | 集成测试 | update 保留消费者内容 | passed | `npm test` 用例 5 |

## 2. 单元测试

`npm test`：22 passed，0 failed。

## 3. 集成与回归测试

`npm run check`：`WORKSPACE_OK yaml=6 markdown=30 changes=2`，`PACKAGE_OK files=32`。

## 4. 非功能验证

- `git diff --check`：通过。
- `npm pack --dry-run`：0.5.0 共 32 个发布文件，不包含 changes、test、scripts、repos 或 runtime。

## 5. 发布证据引用

发布步骤和回滚见 [`release.md`](./release.md)，本文件只记录验证结果。

## 6. 未运行与未覆盖项

- 不修改 `my-devix`，由用户发布后自行执行 `devix update`。
- 未连接真实 Kconf、Redis、Task 或 RPC 平台；本次只实现 Devix 规格和门禁能力。
