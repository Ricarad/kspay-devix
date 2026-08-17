# 决策记录

## D1 固定生成 Release 文档

- 状态：已确认
- 确认人：chenshaojie
- 日期：2026-08-18
- 决策：新 change 固定生成 `release.md`，无发布影响时写精简结论。
- 依据：固定入口能避免在开发完成后遗漏远程配置和上线动作。

## D2 组件章节按需展开

- 状态：已确认
- 确认人：chenshaojie
- 日期：2026-08-18
- 决策：模板不预生成 Kconf、Redis、Task、RPC 等组件标题，只记录本需求实际涉及的内容。

## D3 采用条件式发布准备门禁

- 状态：已确认
- 确认人：chenshaojie
- 日期：2026-08-18
- 决策：进入 verification 前按 release impact 检查 passed 或 waived，不增加新的生命周期阶段。
