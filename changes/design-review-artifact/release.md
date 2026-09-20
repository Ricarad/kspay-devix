# 发布说明

- 发布影响：有
- 判断依据：修改 Devix 发布源的 change 模板、命令/技能提示和 CLI 产物生成逻辑，消费者通过 `devix update` 获取变更；不修改业务运行时代码。
- 确认状态：已确认

## 发布内容

- 发布源新增 `design-review.md` 模板和 `artifacts.design_review` 兼容逻辑。
- 新 change 默认生成人工评审视图，旧 change 不强制迁移。
- 同步更新工作区 `AGENTS.md`、标准文档、命令模板、插件 skill 和工作流说明。

## 发布与回滚

- 发布前：运行 `npm test`、`npm run check`、`git diff --check` 和严格 change 校验。
- 发布后：在临时消费者工作区验证新建 change 生成 `design-review.md`，并验证旧 change 仍能通过校验。
- 回滚：恢复发布源提交并重新执行 `devix update`；已有 change 中已生成的 `design-review.md` 保留为历史文件，不影响旧 CLI 读取。

## 当前记录

- `npm test`：42/42 通过。
- `npm run check`：工作区和 npm package 检查通过。
- `devix change validate design-review-artifact --strict`：通过。
- 临时消费者工作区 smoke test：新建 change 成功生成 `design-review.md`，并在上下文中暴露为 optional artifact。
- `release_readiness`：待发布负责人确认；当前未进入 verification/closed。

> 确认为无发布影响时，只保留上面的精简结论并删除本说明。确认为有发布影响时，按照 [`standards/release.md`](../../standards/release.md) 增加通用发布内容，并且只展开本需求真实涉及的配置或组件；不得保留无关组件标题、空表格或占位章节。
