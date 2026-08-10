const fs = require("node:fs");
const path = require("node:path");
const { DevixError } = require("./errors");

const PACKAGE_ROOT = path.resolve(__dirname, "..");

function copyDirectory(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

function initializeWorkspace(targetPath, options = {}) {
  const target = path.resolve(targetPath);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    throw new DevixError("WORKSPACE_NOT_EMPTY", `目标目录不是空目录：${target}`);
  }
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(path.join(target, "changes"));
  fs.mkdirSync(path.join(target, "repos"));
  fs.mkdirSync(path.join(target, ".devix", "runtime"), { recursive: true });

  const workspaceTemplates = path.join(PACKAGE_ROOT, "templates", "workspace");
  fs.copyFileSync(path.join(PACKAGE_ROOT, "AGENTS.md"), path.join(target, "AGENTS.md"));
  fs.copyFileSync(path.join(workspaceTemplates, "devix.yaml"), path.join(target, "devix.yaml"));
  fs.copyFileSync(path.join(workspaceTemplates, "repositories.yaml"), path.join(target, "repositories.yaml"));
  fs.copyFileSync(path.join(workspaceTemplates, "README.md"), path.join(target, "README.md"));
  fs.copyFileSync(path.join(workspaceTemplates, "changes-README.md"), path.join(target, "changes", "README.md"));
  fs.copyFileSync(path.join(workspaceTemplates, "gitignore.template"), path.join(target, ".gitignore"));
  copyDirectory(path.join(PACKAGE_ROOT, "standards"), path.join(target, "standards"));
  copyDirectory(path.join(PACKAGE_ROOT, "knowledge"), path.join(target, "knowledge"));

  const warnings = [];
  if (options.branch) {
    warnings.push("--branch 已弃用：Devix 工作空间不再初始化 Git，该参数已忽略");
  }
  if (options.noGit) {
    warnings.push("--no-git 已弃用：Devix 工作空间默认且始终不初始化 Git");
  }

  return {
    workspace: target,
    git_initialized: false,
    git_branch: null,
    warnings,
    next_commands: [
      `cd ${target}`,
      "devix repo add <repo-id> --url <git-url> --base master",
      "devix change new <change-id> --title <title>",
    ],
  };
}

module.exports = { initializeWorkspace };
