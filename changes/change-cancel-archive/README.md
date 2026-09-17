# 支持需求中途取消和原地归档

## 需求与范围

用户确认：需求可能在开发过程中变化，需要在任意未完成阶段取消并归档。复用 cancelled 状态；不把未完成工作标记为 closed/done。仅修改 Devix 发布源，不修改消费者或业务仓库。此前 intake/分支门禁草案仍待单独收敛。

## 验收标准

- A1：任意未完成阶段可取消，必须记录原因、确认人、时间，保留 phase、gate 和发布事实。
- A2：active 需求取消前预检全部仓库并保存 WIP；冲突时保留当前激活状态。非 active 需求不触碰他人代码现场。
- A3：取消和正常完成可原地归档；重试幂等，不移动文件、不删除分支。
- A4：终态不能被 switch、pause、revise、repo-add、advance 重新激活；status/list 可查看历史。
- A5：正常完成仍需原有验证与发布门禁；新能力兼容旧 schema。

## 当前状态

本次发布源 change 保持 paused/implementation，使用显式 change-id 记录；既有 active change 不属于本需求。发布尚未授权。
