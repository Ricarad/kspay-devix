const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("./git");
const { DevixError } = require("./errors");

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
    if (!fs.existsSync(sourceAgents) || !fs.statSync(sourceAgents).isFile()) {
      throw new DevixError("UPDATE_SOURCE_INVALID", "更新源缺少 AGENTS.md");
    }
    if (!fs.existsSync(sourceStandards) || !fs.statSync(sourceStandards).isDirectory()) {
      throw new DevixError("UPDATE_SOURCE_INVALID", "更新源缺少 standards/ 目录");
    }

    const managedFiles = ["AGENTS.md", ...collectFiles(sourceStandards, "standards")];
    const updatedFiles = [];
    const unchangedFiles = [];
    for (const [index, relative] of managedFiles.entries()) {
      const source = path.join(sourceRoot, relative);
      const target = path.resolve(root, relative);
      if (sameContent(source, target)) {
        unchangedFiles.push(relative);
        continue;
      }
      atomicCopy(source, target, index);
      updatedFiles.push(relative);
    }

    return {
      workspace: root,
      source_url: sourceUrl,
      source_branch: sourceBranch,
      source_commit: sourceCommit,
      managed_paths: ["AGENTS.md", "standards/"],
      updated_files: updatedFiles,
      unchanged_files: unchangedFiles,
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
