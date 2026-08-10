# 任务拆解

| ID | 阶段 | 任务 | 状态 | 完成证据 |
|---|---|---|---|---|
| P0.1 | design | 对照两套 changes 结构、状态和重复内容 | done | design 第 2 节 |
| P0.2 | design | 建立目录、生命周期、仓库和规范设计 | done | 根文档、docs、standards |
| P0.3 | design | 建立可复制的 change 模板 | done | templates/change |
| P0.4 | design | 用户评审目录、gate、分支切换和注释规则 | done | 采用五阶段、checkout、自动 WIP 和偏差确认 |
| P1.1 | implementation | 确定 Node.js CLI、schema 和命令契约 | done | package.json、src/cli.js |
| P1.2 | implementation | 实现 new/status/validate/advance | done | CLI 与自动化测试 |
| P2.1 | implementation | 实现 checkout 优先的 pause/switch、两阶段预检和 WIP 快照 | done | 临时 Git 仓库测试 |
| P2.2 | implementation | 激活后恢复上下文并按当前仓库目录执行 CodeGraph sync | done | AGENTS/知识/CodeGraph 测试 |
| P2.3 | verification | 覆盖仓库追加、失败 hook、多仓库、分支偏差、HEAD 漂移、路径边界和文档校验 | done | `npm test` 17/17，`npm run check` 通过 |
| P2.4 | implementation | 分离工具源码与消费者工作空间，实现 init、repo add/list 和安装指引 | done | 最小工作空间、本地 bare Git clone 与打包测试 |
| P2.5 | implementation | 支持 npm exec 一行安装和 install/init 别名 | done | 空目录安装、main 分支初始化和非空目录保护测试 |
| P2.6 | verification | 固定 GitHub 私密仓库地址并防止开发文件进入消费者安装包 | done | package files 白名单与 `check-package.js` |
| P3.1 | design | 设计知识提炼与索引机制 | todo | knowledge 专项方案 |

## 当前下一步

在真实业务仓库试运行第一个 change；知识自动提炼保持后续专项。
