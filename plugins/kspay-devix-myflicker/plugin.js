const { execFileSync } = require("node:child_process");

const COMMANDS = {
  "devix-analyze": "进行需求澄清：创建或恢复 active change，只写 README.md、decisions.md、release.md 和 change.yaml，不分析真实代码。",
  "devix-design": "进行技术设计：读取澄清、知识、仓库规范和真实代码路径，写权威 design.md、派生 design-review.md、tasks.md 与 release.md，不修改业务代码。",
  "devix-code": "进行代码实现：先读取全部正式文档和仓库规范，以 design.md 为唯一实施事实源；自然语言变更按 Local/Delta/Major 分类，Delta/Major 必须同步适用的 design-review.md 并等待确认。",
  "devix-test": "进行验证：以 design.md 为测试事实源，按验收标准和测试设计执行真实测试，写入 verification.md 和 release.md 的证据，未运行不能写 passed。",
  "devix-close": "收口需求：正常完成遵守验证与发布 gate；明确放弃可在任意未完成阶段执行 change cancel --reason --reviewer，保留原 phase；仅在用户要求时 archive 或 cancel --archive。读取工作空间关闭指令，保留 Git 现场和发布待办。",
  "devix-status": "只读展示目标 change、阶段、gate、取消原因和归档状态；历史需求用 change list --include-archived 定位，再显式 status <id>。",
};

function status(cwd) {
  try {
    return JSON.parse(execFileSync("devix", ["change", "status"], { cwd, encoding: "utf8" }));
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  name: "kspay-devix-myflicker",
  initialized() {},
  context() {
    const current = status(this.cwd);
    return {
      "Devix Active Change": current.change_id || "none",
      "Devix Phase": current.phase || "none",
      "Devix Status": current.status || "none",
      "Devix Next Action": current.next_action || "先使用 /devix-analyze 开始需求",
      "Devix Gates": JSON.stringify(current.gates || {}),
      "Devix Blockers": JSON.stringify(current.blockers || []),
    };
  },
  slashCommand() {
    return Object.entries(COMMANDS).map(([name, instruction]) => ({
      type: "prompt",
      name,
      description: instruction,
      getPromptForCommand: async (args) => [{
        role: "user",
        content: `你正在执行 Devix 一级命令 /${name}。${instruction}\n\n当前用户消息和附件就是本次上下文。先读取 workspace、目标 change 和 gate，以及 .codeflicker/commands/${name}.md（存在时）。正常开发遵守阶段顺序；用户明确取消可保留原阶段结束，不能冒充正常完成。${args ? `\n用户补充：${args}` : ""}`,
      }],
    }));
  },
};
