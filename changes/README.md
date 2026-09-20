# changes

每个需求使用一个稳定的 `change-id` 建立独立目录。目录名只使用小写字母、数字和连字符；需求改名不随意改目录，以免链接和历史失效。

```text
changes/<change-id>/
├── change.yaml       # 当前状态与多仓库分支清单，唯一机器可读事实源
├── README.md         # 需求澄清、范围、验收标准、结论与文档索引
├── design.md         # 权威 AI 实施方案
├── design-review.md  # 新 change 默认生成的人工评审视图（派生）
├── tasks.md          # 任务拆解与进度
└── verification.md   # 单测、联调、发布与结果证据
```

日常由 AI 根据用户给出的需求描述或文档自动生成 change-id，并在内部调用 Devix 创建。`devix change new` 只作为调试或人工接管入口。复杂需求可增加 `decisions.md`，历史材料、会议纪要或专项模型也可按需增加，但不能替代上述五个核心文件的职责。

## 当前需求

| Change | 阶段 | 状态 | 入口 |
|---|---|---|---|
| `devix-sdd-bootstrap` | design | active | [`devix-sdd-bootstrap/`](./devix-sdd-bootstrap/README.md) |
