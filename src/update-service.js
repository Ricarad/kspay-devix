const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("./git");
const { DevixError } = require("./errors");
const { CORE_CHANGE_FILES } = require("./files");
const { activateToolchain, prepareToolchain } = require("./toolchain-service");

const DEFAULT_SOURCE_URL = "git@github.com:Ricarad/kspay-devix.git";
const DEFAULT_SOURCE_BRANCH = "main";

function validateSourceUrl(url) {
  if (/^https?:\/\/[^/]*@/i.test(url)) {
    throw new DevixError(
      "UPDATE_SOURCE_CONTAINS_CREDENTIALS",
      "更新源不能内嵌用户名、密码或 token；请使用 SSH 或 Git credential helper",
    );
  }
}

function collectFiles(directory, prefix) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.join(prefix, entry.name);
    if (entry.isSymbolicLink()) {
      throw new DevixError("UPDATE_SOURCE_SYMLINK", `更新源包含符号链接：${relative}`);
    }
    if (entry.isDirectory()) files.push(...collectFiles(absolute, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function sameContent(left, right) {
  if (!fs.existsSync(right)) return false;
  const leftStat = fs.statSync(left);
  const rightStat = fs.statSync(right);
  if (!rightStat.isFile() || leftStat.size !== rightStat.size) return false;
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

function atomicCopy(source, target, index) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.devix-update-${process.pid}-${index}`;
  try {
    fs.copyFileSync(source, temporary);
    fs.chmodSync(temporary, fs.statSync(source).mode);
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function updateWorkspace(root, options = {}) {
  const sourceUrl = options.sourceUrl || DEFAULT_SOURCE_URL;
  const sourceBranch = options.branch || DEFAULT_SOURCE_BRANCH;
  validateSourceUrl(sourceUrl);

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "devix-update-"));
  const sourceRoot = path.join(temporaryRoot, "source");
  try {
    run(
      "git",
      ["clone", "--depth", "1", "--single-branch", "--branch", sourceBranch, sourceUrl, sourceRoot],
      { cwd: temporaryRoot },
    );
    const sourceCommit = run("git", ["rev-parse", "HEAD"], { cwd: sourceRoot }).stdout.trim();
    const sourceAgents = path.join(sourceRoot, "AGENTS.md");
    const sourceStandards = path.join(sourceRoot, "standards");
    const sourceChangeTemplates = path.join(sourceRoot, "templates", "change");
    if (!fs.existsSync(sourceAgents) || !fs.statSync(sourceAgents).isFile()) {
      throw new DevixError("UPDATE_SOURCE_INVALID", "更新源缺少 AGENTS.md");
    }
    if (!fs.existsSync(sourceStandards) || !fs.statSync(sourceStandards).isDirectory()) {
      throw new DevixError("UPDATE_SOURCE_INVALID", "更新源缺少 standards/ 目录");
    }
    if (!fs.existsSync(sourceChangeTemplates) || !fs.statSync(sourceChangeTemplates).isDirectory()) {
      throw new DevixError("UPDATE_SOURCE_INVALID", "更新源缺少 templates/change/ 目录");
    }
    for (const fileName of CORE_CHANGE_FILES) {
      const template = path.join(sourceChangeTemplates, fileName);
      if (!fs.existsSync(template) || !fs.statSync(template).isFile()) {
        throw new DevixError("UPDATE_SOURCE_INVALID", `更新源缺少 change 模板：${fileName}`);
      }
    }

    const prepared = prepareToolchain(sourceRoot, sourceCommit, options);
    const managedFiles = [
      { source: "AGENTS.md", target: "AGENTS.md" },
      ...collectFiles(sourceStandards, "standards").map((relative) => ({ source: relative, target: relative })),
      ...collectFiles(sourceChangeTemplates, "templates/change").map((relative) => ({
        source: relative,
        target: path.join(".devix", "templates", "change", path.relative("templates/change", relative)),
      })),
    ];
    const updatedFiles = [];
    const unchangedFiles = [];
    for (const [index, managed] of managedFiles.entries()) {
      const source = path.join(sourceRoot, managed.source);
      const target = path.resolve(root, managed.target);
      if (sameContent(source, target)) {
        unchangedFiles.push(managed.target);
        continue;
      }
      atomicCopy(source, target, index);
      updatedFiles.push(managed.target);
    }
    const cli = activateToolchain(prepared);

    return {
      workspace: root,
      source_url: sourceUrl,
      source_branch: sourceBranch,
      source_commit: sourceCommit,
      managed_paths: ["AGENTS.md", "standards/", ".devix/templates/change/"],
      updated_files: updatedFiles,
      unchanged_files: unchangedFiles,
      cli,
      git_commit_created: false,
      git_push_performed: false,
    };
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

module.exports = {
  DEFAULT_SOURCE_BRANCH,
  DEFAULT_SOURCE_URL,
  updateWorkspace,
  validateSourceUrl,
};
