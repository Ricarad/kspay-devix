# Devix 安装与工作空间初始化

## 1. 安装 Devix CLI

Devix 当前托管在 GitHub 私密仓库。使用者需要先由仓库管理员添加访问权限，并确保本机执行 `ssh -T git@github.com` 能通过认证。

### 一条命令安装到当前目录

先进入一个空目录，然后执行：

```bash
npm exec --yes \
  --package='git+ssh://git@github.com/Ricarad/kspay-devix.git#main' \
  -- devix install .
```

这条命令会临时从 Git 下载 Devix CLI，在当前目录生成最小工作空间，不会初始化工作空间 Git，也不会把 Devix CLI 永久安装到全局。目标目录不是空目录时会停止，避免覆盖已有文件。

下载到 npm 临时缓存中的包仅包含 CLI 运行时、消费者模板、通用规范和安装文档，不包含 Devix 自身的 `changes/`、`test/`、`scripts/` 或内部设计文档；最终目标目录只生成下文列出的消费者工作空间。

也可以直接指定目标目录，无需提前 `cd`：

```bash
npm exec --yes \
  --package='git+ssh://git@github.com/Ricarad/kspay-devix.git#main' \
  -- devix install ~/work/kspay-workspace
```

### 首次安装稳定入口

需要长期使用 `devix update`、change 和 repo 命令时，从 Git 地址全局安装一次作为引导：

```bash
npm install -g 'git+ssh://git@github.com/Ricarad/kspay-devix.git#main'
devix --help
```

若内部 Git 地址不适合 npm 直接解析，可先克隆工具源码：

```bash
git clone -b main git@github.com:Ricarad/kspay-devix.git ~/.local/share/kspay-devix
npm install -g ~/.local/share/kspay-devix
```

要求 Node.js 18 或以上。首次执行 `devix update` 后，最新版 CLI 会安装到 `~/.devix/versions/<version>-<commit>/`，`~/.devix/current` 原子指向当前版本，稳定启动器位于 `~/.local/bin/devix`。请确保 `~/.local/bin` 位于 PATH 中且优先于 npm 全局 bin；之后无需再次执行全局 npm 安装。

### 统一更新 CLI、规则与模板

发布者只在 `kspay-devix` 源仓库修改并推送平台规则。使用者在自己的 Devix 工作空间根目录执行：

```bash
devix update
```

命令每次从 GitHub `main` 获取最新发布版本，并完成四件事：把 CLI 安装到新的用户级版本缓存并原子切换稳定启动器；同步平台托管的 `AGENTS.md` 和 `standards/`；同步 `.devix/templates/change/` 供之后的新 change 使用；同步 `.codeflicker/commands/` 下六个 Devix 斜杠命令。失败时保留原 CLI current 指针。

它不修改已有 `changes/`、`knowledge/`、`repositories.yaml`、`repos/`、`.devix/runtime/` 或 Git 远端，也不会 stage、commit、push；change 模板更新只影响之后创建的新 change，六个 Devix 斜杠命令则会更新到最新版本，其他 `.codeflicker/commands/` 文件不受影响。

临时验证其他发布分支或源地址时可以显式指定：

```bash
devix update --branch main
devix update --source git@github.com:Ricarad/kspay-devix.git --branch main
```

## 2. 创建最小工作空间

```bash
devix install ~/work/kspay-workspace
cd ~/work/kspay-workspace
```

初始化会在工作区生成 `.codeflicker/commands/` 下的六个一级命令：`/devix-analyze`、`/devix-design`、`/devix-code`、`/devix-test`、`/devix-close` 和 `/devix-status`。MyFlicker 启动时会从该项目目录发现这些命令；Codex 仍通过 `devix agent install` 注册对应 skills。

该命令生成：

```text
kspay-workspace/
├── AGENTS.md
├── README.md
├── devix.yaml
├── repositories.yaml
├── changes/
├── knowledge/
├── standards/
├── repos/                  # Git 忽略
├── .codeflicker/
│   └── commands/            # 初始化生成的六个 Devix 斜杠命令
└── .devix/
    ├── runtime/            # 本机 active change 状态
    └── templates/change/   # update 管理的新 change 模板
```

生成结果是普通工作目录：根目录不初始化 Git，`changes/` 当前也不初始化独立 Git。`knowledge/`、`repositories.yaml` 和 `.devix/runtime/` 同样只作为本机文件保存；不要为工作空间根目录配置 Git 远端。`repos/` 中的业务仓库仍保持各自独立的 Git。

旧安装脚本中的 `--branch` 和 `--no-git` 暂时仍可被接受，但两个参数都不会执行 Git 操作，命令结果会返回弃用提示。新脚本不应继续传入它们。

## 3. 登记并克隆业务仓库

```bash
devix repo add kspay-promo \
  --url git@<git-host>:<group>/kspay-promo.git \
  --base master

devix repo add kspay-promo-touch \
  --url git@<git-host>:<group>/kspay-promo-touch.git \
  --base master

devix repo list
```

`repo add` 会校验仓库 ID、按基线分支 clone 到 `repos/<repo-id>`、写入 `repositories.yaml`，并返回根 `AGENTS.md` 和 CodeGraph 状态。它不执行 pull、push 或业务提交。

不要把用户名、密码或 token 写进 HTTPS Git URL；CLI 会拒绝这类地址。使用 SSH 地址或本机 Git credential helper。

CodeGraph 默认只在已有 `.codegraph/` 时 sync。首次明确需要建索引时显式执行：

```bash
devix repo add kspay-promo \
  --url <git-url> \
  --base master \
  --codegraph-init
```

## 4. 日常开始需求

安装和仓库登记只做一次。之后不需要手工拼 CLI 参数，直接在支持 Devix 工作空间的 AI 会话中提供输入：

```text
开始一个新需求：银行卡会场需要增加端外 Push，要求……
```

或者：

```text
按这份需求文档开始：/path/to/requirement.md
```

也可以直接附加需求文档或发送文档链接。AI 会自动完成：

1. 从内容生成 change-id 和标题。
2. 检查并保存当前 active change。
3. 创建核心 change 文件和 `decisions.md`，登记原始文档路径/链接并整理需求与发布影响。
4. 在澄清后读取 knowledge 和 `repositories.yaml`。
5. 判断影响仓库，内部执行 repo-add、切换 feature branch 和 CodeGraph sync。
6. 只有关键需求歧义或 Git 现场偏差时才请求确认。

以下命令只用于调试或人工接管：

```bash
devix change new bank-seckill-push --title "银行卡会场端外 Push"
devix change repo-add bank-seckill-push --repo kspay-promo
devix change status
```

如果人工操作时已经确定仓库，也可以合并：

```bash
devix change new bank-seckill-push \
  --title "银行卡会场端外 Push" \
  --repo kspay-promo
```

## 5. 注册 Codex 与 MyFlicker 命令

在 Devix 工作空间或源码仓库执行：

```bash
devix agent install
```

命令会自动检测已安装的 Codex 和 MyFlicker，并幂等安装双客户端插件。也可以指定客户端：

```bash
devix agent install --target codex
devix agent install --target myflicker
```

安装后 `/` 面板会直接检索到 `/devix-analyze`、`/devix-design`、`/devix-code`、`/devix-test`、`/devix-close` 和 `/devix-status`。这些命令不需要参数；需求原文、附件和 Docs 链接由当前会话自动提供给对应阶段。

## 6. 工作空间 Git 边界

消费者工作空间根目录不是 Git 仓库，也不应配置 Git 远端。当前 `changes/`、`knowledge/`、`repositories.yaml` 和 `.devix/runtime/` 都只保存在本机；需求共享方案后续单独设计。

根 `.gitignore` 仍会生成，用于工作空间被意外放入外层 Git 时保护 `repos/`、`.devix/runtime/`、`.worktrees/`、CodeGraph 索引和依赖目录。`repos/<repo-id>` 下由 `repo add` 克隆的业务仓库不受影响，继续维护各自的 `.git`、远端和分支历史。
