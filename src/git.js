const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { DevixError } = require("./errors");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env || process.env,
  });
  if (result.error || result.status !== 0) {
    if (options.allowFailure) {
      return result;
    }
    throw new DevixError("COMMAND_FAILED", `${command} ${args.join(" ")} 执行失败`, {
      cwd: options.cwd,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr || result.error?.message,
    });
  }
  return result;
}

function git(repoPath, args, options = {}) {
  return run("git", args, { ...options, cwd: repoPath });
}

function assertRepository(repoPath, repoId) {
  const result = git(repoPath, ["rev-parse", "--is-inside-work-tree"], { allowFailure: true });
  if (result.status !== 0 || result.stdout.trim() !== "true") {
    throw new DevixError("REPOSITORY_INVALID", `不是有效 Git 仓库：${repoId}`, { repoPath });
  }
}

function currentBranch(repoPath) {
  const result = git(repoPath, ["symbolic-ref", "--quiet", "--short", "HEAD"], {
    allowFailure: true,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function head(repoPath, ref = "HEAD") {
  const result = git(repoPath, ["rev-parse", ref], { allowFailure: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

function statusEntries(repoPath) {
  const output = git(repoPath, ["status", "--porcelain=v1", "--untracked-files=all"]).stdout;
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2), path: line.slice(3) }));
}

function branchExists(repoPath, branch) {
  return git(repoPath, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
    allowFailure: true,
  }).status === 0;
}

function resolveBaseBranch(repoPath) {
  for (const branch of ["main", "master"]) {
    if (branchExists(repoPath, branch)) {
      return branch;
    }
  }
  const branch = currentBranch(repoPath);
  if (!branch) {
    throw new DevixError("BASE_BRANCH_UNKNOWN", `无法判断基线分支：${repoPath}`);
  }
  return branch;
}

function createWipCommit(repoPath, changeId) {
  git(repoPath, ["add", "-A"]);
  git(repoPath, ["commit", "-m", `WIP(devix): pause ${changeId}`]);
  return head(repoPath);
}

function checkout(repoPath, branch, baseBranch) {
  if (branchExists(repoPath, branch)) {
    git(repoPath, ["checkout", branch]);
  } else {
    git(repoPath, ["checkout", "-b", branch, baseBranch]);
  }
}

function syncCodeGraph(repoPath, env = process.env) {
  if (!fs.existsSync(path.join(repoPath, ".codegraph"))) {
    return { status: "missing", path: repoPath };
  }
  const result = run("codegraph", ["sync", repoPath], { cwd: repoPath, env, allowFailure: true });
  if (result.status !== 0) {
    return {
      status: "failed",
      path: repoPath,
      stderr: result.stderr,
      stdout: result.stdout,
    };
  }
  return { status: "synced", path: repoPath, stdout: result.stdout };
}

function resolveRepositoryPath(root, repository) {
  const worktree = repository.workspace_mode === "worktree";
  if (worktree) {
    if (!repository.worktree_path) {
      throw new DevixError("WORKTREE_PATH_MISSING", `仓库 ${repository.id} 未配置 worktree_path`);
    }
  }
  const workspaceBase = path.resolve(root, worktree ? ".worktrees" : "repos");
  const resolved = path.resolve(root, worktree ? repository.worktree_path : repository.local_path);
  if (resolved !== workspaceBase && !resolved.startsWith(`${workspaceBase}${path.sep}`)) {
    throw new DevixError("REPOSITORY_PATH_OUTSIDE_WORKSPACE", `仓库 ${repository.id} 路径超出允许范围`, {
      resolved,
      workspace_base: workspaceBase,
    });
  }
  return resolved;
}

module.exports = {
  assertRepository,
  branchExists,
  checkout,
  createWipCommit,
  currentBranch,
  git,
  head,
  resolveBaseBranch,
  resolveRepositoryPath,
  run,
  statusEntries,
  syncCodeGraph,
};
