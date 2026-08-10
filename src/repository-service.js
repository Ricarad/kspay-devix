const fs = require("node:fs");
const path = require("node:path");
const {
  loadRepositoryCatalog,
  saveRepositoryCatalog,
} = require("./files");
const {
  assertRepository,
  currentBranch,
  head,
  run,
  syncCodeGraph,
} = require("./git");
const { DevixError } = require("./errors");

function validateRepositoryId(id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) {
    throw new DevixError("REPOSITORY_ID_INVALID", `仓库 ID 无效：${id}`);
  }
}

function rootAgents(repoPath) {
  const agent = path.join(repoPath, "AGENTS.md");
  return fs.existsSync(agent) ? [agent] : [];
}

function addRepository(root, id, options = {}) {
  validateRepositoryId(id);
  if (!options.url) {
    throw new DevixError("REPOSITORY_URL_REQUIRED", "必须通过 --url 提供 Git 地址");
  }
  if (/^https?:\/\/[^/]*@/i.test(options.url)) {
    throw new DevixError(
      "REPOSITORY_URL_CONTAINS_CREDENTIALS",
      "Git 地址不能内嵌用户名、密码或 token；请使用 SSH 或 Git credential helper",
    );
  }
  const baseBranch = options.baseBranch || "master";
  const catalog = loadRepositoryCatalog(root);
  if ((catalog.repositories || []).some((repository) => repository.id === id)) {
    throw new DevixError("REPOSITORY_EXISTS", `仓库已登记：${id}`);
  }
  const localPath = path.join("repos", id);
  const repoPath = path.resolve(root, localPath);
  if (fs.existsSync(repoPath)) {
    throw new DevixError("REPOSITORY_PATH_EXISTS", `仓库目录已存在：${repoPath}`);
  }

  run("git", ["clone", "--branch", baseBranch, options.url, repoPath], { cwd: root });
  assertRepository(repoPath, id);
  if (currentBranch(repoPath) !== baseBranch) {
    throw new DevixError("BASE_BRANCH_MISMATCH", `克隆后分支不是 ${baseBranch}`, {
      actual_branch: currentBranch(repoPath),
    });
  }

  const repository = {
    id,
    url: options.url,
    local_path: localPath,
    base_branch: baseBranch,
  };
  catalog.repositories = [...(catalog.repositories || []), repository];
  saveRepositoryCatalog(root, catalog);

  let codegraph;
  if (options.initializeCodeGraph) {
    const result = run("codegraph", ["init", repoPath], { cwd: repoPath, allowFailure: true });
    codegraph = result.status === 0
      ? { status: "initialized", path: repoPath, stdout: result.stdout }
      : { status: "failed", path: repoPath, stdout: result.stdout, stderr: result.stderr };
  } else {
    codegraph = syncCodeGraph(repoPath, options.env);
  }

  const response = {
    ...repository,
    absolute_path: repoPath,
    branch: currentBranch(repoPath),
    head: head(repoPath),
    agents: rootAgents(repoPath),
    codegraph,
  };
  if (codegraph.status === "failed") {
    throw new DevixError(
      "CODEGRAPH_INIT_FAILED",
      "仓库已克隆并登记，但 CodeGraph 初始化失败",
      response,
    );
  }
  return response;
}

function listRepositories(root) {
  const catalog = loadRepositoryCatalog(root);
  return (catalog.repositories || []).map((repository) => {
    const repoPath = path.resolve(root, repository.local_path);
    const exists = fs.existsSync(repoPath);
    return {
      ...repository,
      absolute_path: repoPath,
      cloned: exists,
      branch: exists ? currentBranch(repoPath) : null,
      head: exists ? head(repoPath) : null,
    };
  });
}

module.exports = { addRepository, listRepositories, validateRepositoryId };
