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

这条命令会临时从 Git 下载 Devix CLI，在当前目录生成最小工作空间并执行 `git init -b main`，不会把 Devix CLI 永久安装到全局。目标目录不是空目录时会停止，避免覆盖已有文件。

下载到 npm 临时缓存中的包仅包含 CLI 运行时、消费者模板、通用规范和安装文档，不包含 Devix 自身的 `changes/`、`test/`、`scripts/` 或内部设计文档；最终目标目录只生成下文列出的消费者工作空间。

也可以直接指定目标目录，无需提前 `cd`：

```bash
npm exec --yes \
  --package='git+ssh://git@github.com/Ricarad/kspay-devix.git#main' \
  -- devix install ~/work/kspay-workspace --branch main
```

### 全局安装

从 Git 地址直接安装：

```bash
npm install -g 'git+ssh://git@github.com/Ricarad/kspay-devix.git#main'
devix --help
```

若内部 Git 地址不适合 npm 直接解析，可先克隆工具源码：

```bash
git clone -b main git@github.com:Ricarad/kspay-devix.git ~/.local/share/kspay-devix
npm install -g ~/.local/share/kspay-devix
```

要求 Node.js 18 或以上。CLI 的安装位置与日常工作空间相互独立。

## 2. 创建最小工作空间

```bash
devix install ~/work/kspay-workspace --branch main
cd ~/work/kspay-workspace
```

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
└── .devix/runtime/         # Git 忽略
```

默认执行 `git init -b main`，但不会 commit、配置远端或 push。已有外层仓库或不希望初始化 Git 时使用 `--no-git`。

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
3. 创建五文件 change，登记原始文档路径/链接并整理需求。
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

## 5. 配置工作空间远端

通用 `AGENTS.md`、`standards/`、`knowledge/`、模板配置和仓库 catalog 适合通过 Git 分享。个人 `changes/` 是否提交由使用者决定。

```bash
git remote add origin <workspace-git-url>
git add AGENTS.md README.md devix.yaml repositories.yaml standards knowledge changes/README.md .gitignore
git commit -m "Initialize Devix workspace"
git push -u origin main
```

`repos/`、`.devix/runtime/` 和 `node_modules/` 已被忽略，不会进入工作空间 Git。
