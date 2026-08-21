const { execFileSync } = require("node:child_process");

const COMMANDS = {
  "devix-analyze": "进行需求澄清：创建或恢复 active change，只写 README.md、decisions.md、release.md 和 change.yaml，不分析真实代码。",
  "devix-design": "进行技术设计：读取澄清、知识、仓库规范和真实代码路径，写 design.md、tasks.md 与 release.md，不修改业务代码。",
  "devix-code": "进行代码实现：先读取全部正式文档和仓库规范；自然语言变更按 Local/Delta/Major 分类，Delta/Major 必须先落档并等待确认。",
  "devix-test": "进行验证：按验收标准和测试设计执行真实测试，写入 verification.md 和 release.md 的证据，未运行不能写 passed。",
  "devix-close": "收口需求：检查所有正式文档、验证证据、release SOP 和待决策项，满足 gate 后再关闭 change。",
  "devix-status": "只读展示 active change、阶段、gate、阻塞项、待决策、仓库现场和发布准备状态。",
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
        content: `你正在执行 Devix 一级命令 /${name}。${instruction}\n\n当前用户消息和附件就是本次上下文。先读取当前 workspace、active change 和 gate；严格按阶段顺序执行，不要静默越级。${args ? `\n用户补充：${args}` : ""}`,
      }],
    }));
  },
};
