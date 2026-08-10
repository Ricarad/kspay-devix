# 决策与待确认项

## 已采纳的设计基线

| ID | 决策 | 依据 | 状态 |
|---|---|---|---|
| D1 | Devix 与业务代码仓库保持独立 Git 历史 | 用户明确要求忽略 repos，通用规范和知识通过 Devix Git 分享 | confirmed |
| D2 | `change.yaml` 作为机器可读状态源 | 现有状态散落，无法可靠切换和校验 | confirmed |
| D3 | 每个 change 固定五文件，复杂决策才增设 decisions | 用户选择五阶段五文件，降低维护成本 | confirmed |
| D4 | 默认使用 checkout 切换需求分支，worktree 仅显式可选 | 实际开发以串行为主，固定目录和分支索引更清晰 | confirmed |
| D5 | 需求澄清后、进入 design 前强制读取相关知识 | 避免范围未明时泛读，同时让历史约束进入方案 | confirmed |
| D6 | 业务仓库及模块 AGENTS 优先于 Devix 编码缺省规范 | 代码必须遵循仓库自身工程约束，Devix 只提供跨仓库兜底 | confirmed |
| D7 | 已存在 CodeGraph 索引时，切换现场后先 sync 再分析代码 | 避免用旧分支索引得出错误调用链；用户明确 CodeGraph 是关键能力 | confirmed |
| D8 | active change 指针仅保存在本机，分支与恢复摘要写入 change.yaml | 兼顾个人开发状态和可选 Git 持久化 | confirmed |
| D9 | 符合预期的 dirty feature branch 自动本地 WIP，不 push | 支持无人工干预的串行 change 切换 | confirmed |
| D10 | 实际分支与预期不符时停止并请求确认 | 开发者手工改变现场属于流程外行为，确认优先于自动接管 | confirmed |
| D11 | 新需求以自然语言或需求文档为唯一日常入口 | change-id、标题、仓库和分支属于 Devix 内部状态，不转嫁给使用者 | confirmed |

## 待确认项

| ID | 问题 | 影响 | 建议 |
|---|---|---|---|
| Q4 | Devix 仓库是否需要远程地址和首个提交 | 影响中心化保存 | 设计确认后再配置远程并提交 |
