# kspay-devix

`kspay-devix` 是一个面向多代码仓库的 SDD（Spec-Driven Development，规格驱动开发）工作区。它集中保存需求事实、技术方案、决策、任务状态和工程规范；业务代码仓库仍保留各自独立的 Git 历史。

## 目录

```text
kspay-devix/
├── AGENTS.md                 # AI 与开发者必须遵守的根级协作规则
├── devix.yaml                # 工作区配置和生命周期定义
├── changes/                  # 每个需求一份可追踪的规格包
├── templates/change/         # 新需求模板
├── standards/                # 编码、注释、测试等长期规范
├── docs/                     # Devix 自身的工作流与仓库管理设计
├── knowledge/                # 跨需求知识库的预留入口
├── bin/、src/                # Devix CLI 与状态控制器
├── test/                     # 临时 Git 仓库集成测试
├── repos/                    # 业务代码仓库，不进入 Devix Git
└── .worktrees/               # 可选的 Git worktree，不进入 Devix Git
```

## 一条需求如何开始

使用者只需把需求描述、需求文档或文档链接发给 AI，并说明“开始这个需求”，不需要填写 change-id、仓库或分支参数。AI 内部执行：

1. 从内容生成 change-id 和标题，保存当前 active change 并创建五文件规格包。
2. 在 `clarification` 整理原始输入、范围和验收标准，进入设计前定向读取知识库。
3. 从 `repositories.yaml` 和代码现状判断影响仓库，自动关联 feature branch。
4. 在 `design` 完成 CodeGraph/代码勘察、技术方案和任务拆解。
5. 方案通过评审后进入 `implementation`，最后在 `verification` 留下证据并关闭。

完整规则见 [`docs/workflow.md`](./docs/workflow.md)，多仓库与分支规则见 [`docs/repository-management.md`](./docs/repository-management.md)。

## 核心原则

- `change.yaml` 是阶段、仓库分支、阻塞项和下一步动作的机器可读事实源。
- Markdown 负责完整分析、方案和评审依据，不重复充当另一套状态机。
- `repos/` 只放代码仓库并整体忽略；Devix Git 只中心化保存规格、规范和知识。
- 默认在 `repos/<repo-id>` 中按 change 自动保存现场并切换 feature branch；worktree 仅在确有同仓库并行开发需要时显式启用。
- AI 不自行通过需求澄清或技术评审 gate，不在 `implementation` 之前生成工程代码。
- 编码前必须读取每个目标业务仓库及目标模块适用的 `AGENTS.md`；仓库规范优先，Devix 通用规范只补空白。
- 已建立 CodeGraph 索引的仓库在切换分支/worktree 后、首次代码分析前必须先 `sync`，再通过 CodeGraph 读取源码和调用链。

当前仓库自身的设计记录位于 [`changes/devix-sdd-bootstrap/`](./changes/devix-sdd-bootstrap/README.md)。

## 安装与命令

完整步骤见 [`docs/installation.md`](./docs/installation.md)。推荐把 Devix CLI 与实际工作空间分开：

```bash
npm install -g 'git+ssh://git@github.com/Ricarad/kspay-devix.git#main'
devix install ~/work/my-devix --branch main

cd ~/work/my-devix
devix repo add kspay-promo --url <git-url> --base master
devix update
```

平台通用规则只在本仓库修改和发布。消费者运行 `devix update` 后，仅同步 `AGENTS.md` 与 `standards/`；个人 changes、知识、仓库登记、业务代码和本机状态保持不变，命令也不会自动 commit 或 push。

在 Devix 源码仓库本地开发时，也可以：

```bash
npm install
npm link
```

以下命令用于调试或人工接管，日常需求入口不需要手工执行：

```bash
# 创建 change；仓库默认解析为 repos/kspay-promo，基线可用 kspay-promo:master 显式指定
devix change new example-change --title "示例需求" --repo kspay-promo:master

# 澄清后才确定影响仓库时，可追加仓库；active change 会立即创建/切换需求分支
devix change repo-add example-change --repo kspay-promo:master

# 暂停当前 change，或切回历史 change
devix change pause
devix change switch example-change

# 校验并单步推进阶段
devix change validate example-change
devix change advance example-change --to design
```

遇到 `WORKSPACE_CONFLICT` 时，CLI 会输出预期/实际分支、HEAD 和修改文件并停止。只有用户确认普通功能分支应归属于当前 change 后，才使用 `--adopt-current-branch` 重试；该参数不能接管 main/master 或 detached HEAD。
