# 验证与交付记录

## 1. 验收标准映射

| 验收 ID | 测试层级 | 状态 | 证据 |
|---|---|---|---|
| A1 | CLI 集成测试 | passed | new 创建恰好五文件并写入 active change |
| A2 | schema/恢复测试 | passed | 分支、HEAD、resume、知识来源和下一步恢复通过 |
| A3 | 临时 Git 仓库测试 | passed | dirty feature branch 自动提交 tracked/untracked 修改 |
| A4 | 多仓库预检测试 | passed | 任一分支偏差时其他仓库不产生 WIP commit |
| A5 | 分支冲突测试 | passed | mismatch、main/master、HEAD drift 均停止；确认后可接管普通功能分支 |
| A6 | 恢复与 CodeGraph 测试 | passed | 分支、根/模块 AGENTS、知识来源和 sync 路径恢复通过 |
| A7 | 生命周期校验测试 | passed | design 前校验 clarification gate 与 knowledge_status |
| A8 | 文本一致性检查 | passed | 根规则和 standards 已明确仓库 AGENTS 优先 |
| A9 | Git 状态检查 | passed | active 指针位于忽略目录；CLI 不执行 push 或 Devix 自动 commit |
| A10 | 安装初始化测试 | passed | init 不暴露工具源码目录；repo add 从本地 bare Git 按指定基线 clone 并登记 catalog |
| A11 | 自然需求入口规则 | passed | 根 AGENTS、源码/消费者 README 和安装指引均规定 AI 自动建 change，CLI 仅用于接管 |
| A12 | 单命令目录安装 | passed | install/init 别名生成最小工作空间并初始化 main；非空目录拒绝覆盖 |
| A13 | 发布边界检查 | passed | npm 包白名单和自动检查均排除 changes、test、scripts、repos、runtime 与内部设计文档 |
| A14 | 私密仓库远端安装 | passed | 从 GitHub main 执行 npm exec，目标目录只包含消费者工作空间并初始化 Git main |

## 2. 单元与集成测试

执行目录：`/Users/chenshaojie/Documents/kspay-devix`

```text
npm test
17 tests passed, 0 failed

npm run check
WORKSPACE_OK yaml=5 markdown=22 changes=1
PACKAGE_OK files=28

npm pack --dry-run
消费者包仅包含 CLI、工作空间模板、standards、knowledge 和安装文档

npm exec --yes --package='git+ssh://git@github.com/Ricarad/kspay-devix.git#main' -- devix install <temp-dir> --branch main
远端安装成功；目标目录未出现 src、test、scripts、templates、docs 或 node_modules
```

## 3. 文档与结构验证

- YAML 解析：passed
- Markdown 相对链接：passed
- 五文件模板：passed
- Git ignore：passed

## 4. 未运行与未覆盖项

- 真实业务仓库暂不执行自动 WIP 或 checkout，统一通过临时 Git 仓库验证。
- CodeGraph 不自动 init；已使用临时索引目录和替身命令验证 sync 触发，未连接真实业务索引。
