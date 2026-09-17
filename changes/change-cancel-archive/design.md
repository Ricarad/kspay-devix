# 技术方案

## 真实路径

src/cli.js 分发到 src/change-service.js；pauseChange 已进行多仓预检、WIP 保存并清理 active 指针。switchChange 当前可将终态重新激活，changeStatus 依赖本地仓库存在。源码目录无 CodeGraph 索引，采用文本阅读。

## 行为与数据

新增 cancel [id] --reason --reviewer [--archive]，省略 id 仅使用 active 指针，不能猜测 paused 需求。cancel 保留原 phase，写 status=cancelled 和 cancellation(reason, reviewer, at)，清理自己的 active 指针。当前 active 复用 pauseChange 保存现场；非 active 只更新正式文件与已有快照。cancelled 重试保留首次记录。

新增 archive <id> --reason --reviewer，仅允许 cancelled 或 closed/done；写 archive(reason, reviewer, at)，不覆盖 status。cancel --archive 使用同一原因和确认人。取消终态仍保留发布待办，归档不是回滚或上线清理。

新增 change list [--include-archived]，默认隐藏归档记录；status <id> 对终态读取记录快照，不依赖业务仓库仍存在。所有继续执行入口检查终态，switch 必须在暂停另一个 active 前检查。正常关闭完成后清理自身 active 指针。

## 兼容与失败

保留 schema v1/v2，新增 nullable 元数据；历史缺少字段按未归档处理，旧 cancelled 无取消元数据仍可读。取消不要求补齐未通过 gate；结构校验仍执行，已取消需求不再执行阶段推进和待增量确认检查。WIP hook 失败不标记 cancelled，保留已生成快照和暂存区以便重试，不承诺跨仓提交回滚。

## 正式文件

取消记录写 README；tasks 标准表格的未完成状态更新为 cancelled 并附取消说明，历史已完成结果不变。release/gate/verification 保留原事实，技能需标出剩余发布处置。

## 测试

临时工作空间和真实 Git 覆盖任意阶段、空仓库、active/paused、冲突、WIP 失败、幂等、归档筛选、历史仓库缺失、终态入口保护及 CLI；运行 npm test 和 npm run check。
