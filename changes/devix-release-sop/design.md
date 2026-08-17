# 技术方案

## 1. 目标、范围与约束

- 新 change 采用 schema v2，核心文件从五个扩展为六个。
- schema v1 继续以原五文件为核心；存在 `release.md` 时恢复上下文仍要加载。
- 生命周期保持五阶段，不新增 release 阶段。
- 发布文档只写真实影响，不用模板制造空组件章节。

## 2. 现状与真实代码路径

- `src/files.js` 使用静态 `CORE_CHANGE_FILES` 生成模板。
- `src/change-service.js` 使用同一列表构建恢复上下文和校验核心文件，`advanceChange` 负责阶段门禁。
- `src/update-service.js` 校验并同步 change 模板，不覆盖已有 changes。
- `scripts/check-workspace.js` 校验发布源模板集合和现有 change。
- 当前发布源没有 `.codegraph/`，因此使用直接源码读取完成勘察。

## 3. 方案概览

1. 定义 schema v1 和 v2 的核心文件集合；当前模板集合为 v2 六文件。
2. `newManifest` 默认生成 schema v2、release 状态和 release_readiness gate。
3. validate 按 schema 选择核心文件，并校验 release 枚举和阶段约束。
4. advance 在进入 verification 和 closed 时执行条件式发布门禁。
5. context 对 v2 把 `release.md` 放入 core files；对 v1 若文件存在则放入 optional files。
6. 模板只提供通用发布结构及按需编写说明，不预建任何组件专属章节。

## 4. 分仓库/模块改动

| 仓库 | 模块 | 改动 | 兼容影响 |
|---|---|---|---|
| kspay-devix | files/change-service | schema v2、生成、校验、门禁与恢复 | schema v1 保持兼容 |
| kspay-devix | templates/docs/AGENTS | Release 模板和工作流规范 | update 只影响后续新 change |
| kspay-devix | tests/check scripts | 六文件与兼容性覆盖 | 无消费者数据迁移 |

## 5. 接口、数据与状态设计

`release.impact`：`pending / none / required`。

`release.status`：`pending / planning / ready / in_progress / completed / not_required`。

进入 verification 时：

- required 必须对应 ready 和 passed；
- none 必须对应 not_required 和 waived；
- gate 的 passed/waived 必须有 reviewer 和 evidence。

进入 closed 时，required 必须 completed，none 必须 not_required，同时仍需 verification gate passed。

## 6. 异常、幂等、并发与事务

- 未知 schema 直接校验失败，避免错误套用文件规则。
- update 继续采用临时目录和原子复制，不修改已有 changes。
- 阶段推进失败不写回 change 状态。

## 7. 兼容、灰度、监控与回滚

- schema v1 仍要求五文件；schema v2 要求六文件。
- 源码仓库升级到 0.5.0 并推送 main；消费者自行执行 `devix update`。
- 回滚时可退回上一版本 CLI；已有 schema v2 change 文件不会被删除。

## 8. 测试设计

覆盖六文件创建、模板无空组件标题、v1 兼容、v1 release 恢复、两类 release gate、closed 收口和 update 隔离。

## 9. 风险、替代方案与未决项

- 风险：固定文件可能被误解为必须填满所有组件。通过模板和规则明确按需展开。
- 放弃方案：将发布细节继续塞入 verification，职责混杂且不利于上线过程持续更新。
- 未决项：无。

## 10. PRD 覆盖检查

| PRD 项 | 状态（已回答/部分/未回答） | 方案位置 | 缺口 |
|---|---|---|---|
| 固定 Release 文档 | 已回答 | 第 3、5 节 | 无 |
| 三环境与前后置动作 | 已回答 | release 模板 | 无 |
| 按需组件章节 | 已回答 | 第 1、3 节 | 无 |
| 条件式门禁 | 已回答 | 第 5 节 | 无 |
