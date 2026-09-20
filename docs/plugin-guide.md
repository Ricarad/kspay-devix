# Devix 插件分享导览

这份导览面向第一次接触 `kspay-devix` 的同事。先记住一个边界：插件提供 AI 客户端里的六个 `/devix-*` 入口；`devix` CLI 负责初始化工作空间、管理仓库和 change 文件。真正可追踪的需求事实，最终保存在工作空间的 Markdown/YAML 产物中，而不是只留在聊天记录里。

## 1. 它解决什么问题

Devix 是一套面向多代码仓库的 SDD（Spec-Driven Development，规格驱动开发）工作流。它把一次需求拆成五个阶段，并用 gate 控制阶段推进：

```text
clarification -> design -> implementation -> verification -> closed
      |              |             |              |             |
   需求事实       技术方案       业务代码       测试证据       收口归档
```

插件支持两个客户端：

- `kspay-devix-codex`：Codex 插件，目录内是六个 skills。
- `kspay-devix-myflicker`：MyFlicker 插件，通过 `plugin.js` 注册同名 slash commands。

两个客户端的命令语义一致，使用同一套工作空间文件和 gate。

## 2. 安装方式

### 前置条件

- Node.js 18 或以上。
- 能访问 `git@github.com:Ricarad/kspay-devix.git`；推荐配置 SSH，先确认 `ssh -T git@github.com` 可用。
- 已安装要使用的客户端：Codex、MyFlicker，或两者都安装。

### 安装 CLI 与工作空间

推荐把 CLI 和实际工作空间分开。首次安装一次稳定入口：

```bash
npm install -g 'git+ssh://git@github.com/Ricarad/kspay-devix.git#main'
devix --help
```

然后创建一个空的 Devix 工作空间：

```bash
devix install ~/work/my-devix
cd ~/work/my-devix
```

`install` 只初始化工作空间，不初始化工作空间 Git，也不会 clone 业务仓库。当前稳定版的 `repo add` 是远程仓库的显式入口：

```bash
devix repo add kspay-promo \
  --url git@<git-host>:<group>/kspay-promo.git \
  --base master
devix repo list
```

本地仓库自动发现（把已有 Git 仓库放入 `repos/` 后由 Devix 识别）属于当前仓库中的独立 change，只有随对应版本发布后才能按该方式接入；在此之前不要把设计中的行为当成已上线能力。

### 安装客户端插件

在 Devix 源码仓库或已安装 CLI 能找到插件源的位置执行：

```bash
devix agent install
```

它会自动检测 Codex 和 MyFlicker，并幂等安装已检测到的客户端。也可以只安装一个：

```bash
devix agent install --target codex
devix agent install --target myflicker
```

安装结果的实现细节是：Codex 插件复制到用户插件目录并更新个人 marketplace；MyFlicker 插件复制到 `~/.devix/plugins/kspay-devix-myflicker`，再注册/更新 `kspay-devix` marketplace。之后在客户端的 `/` 面板中可以看到六个命令。

### 更新

消费者工作空间执行：

```bash
devix update
```

它会更新 CLI、`AGENTS.md`、`standards/`、新 change 模板和六个 slash command 模板；不会覆盖已有 `changes/`、`knowledge/`、`repositories.yaml`、业务仓库或 runtime 状态，也不会自动 commit/push。

## 3. 产物是什么

### 源码发布包

发布源是 `kspay-devix` 仓库。npm 包的运行时入口是 `bin/devix.js`，核心实现位于 `src/`，并携带 `templates/`、`plugins/`、`standards/`、`knowledge/` 和安装文档。开发用的 `changes/`、测试和检查脚本不会进入发布包。

### 使用者工作空间

`devix install` 生成一个普通目录：

```text
my-devix/
├── AGENTS.md                         # AI/开发协作规则
├── README.md                         # 工作空间使用说明
├── devix.yaml                        # 工作空间、阶段和 gate 配置
├── repositories.yaml                 # 业务仓库登记表
├── changes/                          # 每个需求一个 change 目录
├── knowledge/                        # 可跨需求复用的知识
├── standards/                        # 通用工程规范
├── repos/                            # 业务 Git 仓库，各自保留 Git 历史
├── .codeflicker/commands/            # MyFlicker 的六个命令模板
└── .devix/
    ├── runtime/workspace-state.yaml  # 当前 active change，本机状态
    └── templates/change/              # 后续新 change 使用的模板
```

工作空间根目录、`changes/` 和 `.devix/runtime/` 不作为业务 Git 仓库；业务仓库只在 `repos/<repo-id>` 内维护自己的分支、远端和提交历史。

### 单个 change

schema v2 的标准 change 目录如下：

```text
changes/<change-id>/
├── change.yaml       # 机器可读状态、阶段、gate、仓库和恢复点
├── README.md         # 需求目标、范围、场景和验收标准
├── decisions.md      # 待决策、已确认决策和假设（structured change）
├── design.md         # 基于真实代码的权威 AI 实施方案和验证设计
├── design-review.md  # 新 change 默认可生成的人工评审视图
├── tasks.md          # 可执行任务、进度和代码产物清单
├── release.md        # 发布影响、环境差异、SOP、监控和回滚
└── verification.md   # 实际测试、验收和发布验证证据
```

`decisions.md` 是结构化需求的可选文件；由插件 intake 创建的 structured change 会生成它，并固定保留 `Open Decisions`、`Confirmed Decisions`、`Assumptions` 三个章节。

## 4. 六个命令分别在哪个阶段产出什么

| 命令 | 阶段 | 主要动作 | 允许/要求产生的产物 |
|---|---|---|---|
| `/devix-analyze` | clarification | 创建 paused change，整理原始需求、范围、验收和发布影响初判 | 写 `change.yaml`、`README.md`、`decisions.md`、`release.md`；不关联仓库、不读真实业务代码，不提前写设计/任务/验证 |
| `/devix-design` | design | 读取知识、仓库规范、AGENTS 和真实代码调用链 | 写权威 `design.md`、派生 `design-review.md`、`tasks.md`、受影响的 `release.md`；不修改业务代码 |
| `/devix-code` | implementation | 按已批准方案修改声明的业务仓库 | 修改业务代码和测试；同步更新 `tasks.md` 的“代码产物清单”和 `release.md`。Local 可直接做，Delta/Major 先重新落档并等待确认 |
| `/devix-test` | verification | 按代码产物清单生成/补齐单测并执行实际验证 | 登记 generated-test，写 `verification.md` 和实际发布证据；未运行不能写 `passed` |
| `/devix-close` | 正常完成或任意阶段取消 | 根据用户意图区分完成、取消、归档 | 正常完成遵守 gate 后 closed/done；中途放弃保留原 phase 并 cancelled；归档按明确要求附加 archive 记录，保留文件和分支 |
| `/devix-status` | 只读 | 查看 active change、阶段、gate、阻塞、仓库现场和发布准备 | 不修改任何文件 |

命令不是自由跳转按钮。典型 gate 是：`clarification` 通过后才能进 design；`design_review` 通过后才能进 implementation；进入 verification 前必须有发布准备确认或明确的无发布影响豁免；verification 通过后才能 close。人工 gate 必须由用户、评审人或发布负责人确认，插件不会自行批准。

中途取消是独立终态，不走正常完成 gate。例如“需求方向变了，取消并归档这个需求”，插件应使用 `devix change cancel <id> --reason <用户原因> --reviewer <确认人> --archive`。明确取消后不重复索要授权；只补充缺失原因、身份或 Git 冲突信息。默认保留发布待办，不自动执行外部回滚。历史查询使用 `change list --include-archived`，终态不再允许 switch/revise 继续开发。

## 5. 每个产物的意义

| 产物 | 谁读它 | 它回答什么问题 |
|---|---|---|
| `change.yaml` | CLI、插件和恢复流程 | 现在是哪一个需求、处于什么阶段、能否继续、涉及哪些仓库/分支、有哪些 gate 和阻塞 |
| `README.md` | 产品、研发、评审人 | 为什么做、做什么/不做什么、成功标准和如何验收 |
| `decisions.md` | 产品、架构师、仓库负责人 | 哪些选择还没确认，哪些选择已经由谁在何时确认，哪些只是暂时假设 |
| `design.md` | AI、研发和需要深入实现细节的评审人 | 真实调用链是什么、准备如何实现、兼容/回滚和测试怎么设计；它是唯一权威实施方案 |
| `design-review.md` | 产品、架构师、研发负责人和评审人 | 背景、目标、方案、影响、关键取舍、风险和待确认事项是什么；它是派生评审视图 |
| `tasks.md` | 实现者和验证者 | 任务如何拆解、进度如何追踪，以及每个代码文件中具体影响了哪些类/接口/枚举 |
| `release.md` | 发布负责人和 oncall | 是否有发布影响、Staging/PRT/Prod 怎么做、监控什么、何时回滚 |
| `verification.md` | 评审人和后续维护者 | 哪些命令实际跑过、在哪里跑、结果是什么、还缺什么验证 |
| `repositories.yaml` | CLI 和 AI | 仓库 ID 到本地路径、远程地址和基线分支如何映射 |
| `.devix/runtime/workspace-state.yaml` | CLI | 本机当前激活的唯一 change 是谁；它是运行态，不替代 change 正式文档 |

核心原则是“一份事实，一个归属”：需求写 `README.md`，权威方案写 `design.md`，评审表达写派生的 `design-review.md`，状态写 `change.yaml`，测试证据写 `verification.md`，不要把关键结论只写在聊天窗口或 resume 摘要里。评审版不产生独立决策，冲突时先修正权威事实。

## 6. 同事第一次使用的最短路径

```text
安装 CLI
  -> devix install 工作空间
  -> 登记业务仓库（稳定版使用远程 repo add）
  -> devix agent install
  -> 在客户端发送“开始一个新需求：……”
  -> /devix-analyze
  -> /devix-design
  -> 设计评审通过后 /devix-code
  -> release readiness 通过后 /devix-test
  -> 验证和发布收口后 /devix-close
```

日常需求不需要手工填写 change-id、仓库或分支；插件会把当前消息、附件和文档链接交给对应阶段。CLI 的 `devix change new`、`devix change repo-add`、`devix change status` 等命令保留给调试和人工接管。

## 7. 分享时需要特别说明的边界

- 插件不会替代业务仓库的 Git；代码、分支和提交仍在 `repos/<repo-id>` 内。
- `devix update` 不会覆盖已有需求事实，也不会自动提交或推送。
- 当前 change 只能有一个 active；切换需求前，CLI 会检查分支、HEAD 和脏文件，发现现场冲突会停下来请求确认。
- 没有 CodeGraph 时不会擅自初始化索引；已有 `.codegraph/` 的仓库在切换或分析前需要同步。
- release 和 verification 是事实记录，不是计划清单：没有真实执行证据不能标记完成。

更多实现细节见 [`安装文档`](./installation.md)、[`工作流说明`](./workflow.md) 和 [`仓库管理`](./repository-management.md)。
