const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const YAML = require("yaml");

const {
  addRepositories,
  advanceChange,
  createAndActivateChange,
  newManifest,
  pauseChange,
  switchChange,
  validateChange,
} = require("../src/change-service");
const {
  createChangeFiles,
  loadChange,
  loadRuntimeState,
  saveChange,
  saveRuntimeState,
} = require("../src/files");
const { git, head, run } = require("../src/git");
const { initializeWorkspace } = require("../src/workspace-service");
const { addRepository, listRepositories } = require("../src/repository-service");
const { updateWorkspace } = require("../src/update-service");
const { PACKAGE_ENTRY, activateToolchain } = require("../src/toolchain-service");
const { main: cliMain } = require("../src/cli");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devix-test-"));
  fs.mkdirSync(path.join(root, "changes"));
  fs.mkdirSync(path.join(root, "repos"));
  fs.mkdirSync(path.join(root, "knowledge"));
  fs.mkdirSync(path.join(root, "templates"));
  fs.cpSync(path.join(PROJECT_ROOT, "templates", "change"), path.join(root, "templates", "change"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, "devix.yaml"),
    YAML.stringify({
      schema_version: 1,
      workspace: {
        changes_dir: "changes",
        repos_dir: "repos",
        knowledge_dir: "knowledge",
        default_workspace_mode: "checkout",
      },
    }),
  );
  return root;
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function initRepository(root, id, options = {}) {
  const repoPath = path.join(root, "repos", id);
  fs.mkdirSync(repoPath, { recursive: true });
  git(repoPath, ["init", "-b", "main"]);
  git(repoPath, ["config", "user.name", "Devix Test"]);
  git(repoPath, ["config", "user.email", "devix@example.test"]);
  write(path.join(repoPath, ".gitignore"), ".codegraph/\n");
  write(path.join(repoPath, "README.md"), `${id}\n`);
  write(path.join(repoPath, "AGENTS.md"), `# ${id} rules\n`);
  write(path.join(repoPath, "module", "AGENTS.md"), "# module rules\n");
  write(path.join(repoPath, "module", "source.js"), "module.exports = 1;\n");
  git(repoPath, ["add", "-A"]);
  git(repoPath, ["commit", "-m", "initial"]);
  if (options.codegraph) fs.mkdirSync(path.join(repoPath, ".codegraph"));
  return repoPath;
}

function repositoryManifest(root, id, changeId, overrides = {}) {
  const repoPath = path.join(root, "repos", id);
  return {
    id,
    local_path: path.join("repos", id),
    base_branch: "main",
    feature_branch: `feature/${changeId}`,
    workspace_mode: "checkout",
    worktree_path: "",
    modules: ["module"],
    start_ref: head(repoPath, "main"),
    last_known_head: "",
    snapshot: null,
    ...overrides,
  };
}

function createChange(root, id, repositories, overrides = {}) {
  const manifest = {
    ...newManifest(id, `Change ${id}`, repositories),
    ...overrides,
  };
  createChangeFiles(root, id, manifest.title, manifest);
  return manifest;
}

function createFeature(repoPath, branch) {
  git(repoPath, ["checkout", "-b", branch, "main"]);
  return head(repoPath);
}

function setActive(root, changeId) {
  saveRuntimeState(root, { schema_version: 1, active_change_id: changeId });
}

function installFakeCodeGraph(root) {
  const binDir = path.join(root, "fake-bin");
  const executable = path.join(binDir, "codegraph");
  fs.mkdirSync(binDir);
  write(executable, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CODEGRAPH_LOG"\n');
  fs.chmodSync(executable, 0o755);
  return binDir;
}

function installFailingCodeGraph(root) {
  const binDir = path.join(root, "failing-bin");
  const executable = path.join(binDir, "codegraph");
  fs.mkdirSync(binDir);
  write(executable, "#!/bin/sh\nexit 7\n");
  fs.chmodSync(executable, 0o755);
  return binDir;
}

test("new creates exactly five core files and activates the change", () => {
  const root = makeWorkspace();
  const context = createAndActivateChange(root, "new-feature", "New Feature");
  const files = fs.readdirSync(path.join(root, "changes", "new-feature")).sort();
  assert.deepEqual(files, ["README.md", "change.yaml", "design.md", "tasks.md", "verification.md"]);
  assert.equal(loadRuntimeState(root).active_change_id, "new-feature");
  assert.equal(context.phase, "clarification");
  const changeReadme = fs.readFileSync(path.join(root, "changes", "new-feature", "README.md"), "utf8");
  assert.equal(changeReadme.includes("## 事实落档与恢复规则"), true);
  assert.equal(changeReadme.includes("禁止使用任何跨会话 memory"), true);
});

test("init creates a minimal non-Git consumer workspace without tool source directories", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "devix-init-"));
  const target = path.join(parent, "workspace");

  const result = initializeWorkspace(target);

  assert.equal(result.git_initialized, false);
  assert.equal(result.git_branch, null);
  assert.deepEqual(result.warnings, []);
  assert.equal(fs.existsSync(path.join(target, ".git")), false);
  assert.notEqual(git(target, ["rev-parse", "--is-inside-work-tree"], { allowFailure: true }).status, 0);
  for (const required of ["AGENTS.md", "README.md", "devix.yaml", "repositories.yaml", "changes", "knowledge", "standards", "repos", ".devix"]) {
    assert.equal(fs.existsSync(path.join(target, required)), true, required);
  }
  for (const excluded of ["src", "bin", "test", "scripts", "docs", "templates"]) {
    assert.equal(fs.existsSync(path.join(target, excluded)), false, excluded);
  }
  const context = createAndActivateChange(target, "consumer-change", "Consumer Change");
  assert.equal(context.change_id, "consumer-change");
  assert.equal(fs.readdirSync(path.join(target, "changes", "consumer-change")).length, 5);
  assert.equal(
    fs.readFileSync(path.join(target, "changes", "consumer-change", "README.md"), "utf8")
      .includes("## 事实落档与恢复规则"),
    true,
  );
});

test("install accepts deprecated Git options without initializing Git", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "devix-install-"));
  const target = path.join(parent, "workspace");
  const originalWrite = process.stdout.write;
  let output = "";
  process.stdout.write = (chunk) => {
    output += chunk;
    return true;
  };
  try {
    await cliMain(["install", target, "--branch", "main", "--no-git"]);
  } finally {
    process.stdout.write = originalWrite;
  }
  const result = JSON.parse(output);
  assert.equal(fs.existsSync(path.join(target, "devix.yaml")), true);
  assert.equal(fs.existsSync(path.join(target, ".git")), false);
  assert.equal(result.git_initialized, false);
  assert.equal(result.git_branch, null);
  assert.equal(result.warnings.length, 2);
  assert.equal(result.warnings.every((warning) => warning.includes("已弃用")), true);
  assert.throws(() => initializeWorkspace(target), (error) => {
    assert.equal(error.code, "WORKSPACE_NOT_EMPTY");
    return true;
  });
});

test("update syncs only platform-managed files without committing consumer state", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "devix-update-test-"));
  const publisher = path.join(parent, "publisher");
  const workspace = path.join(parent, "workspace");
  fs.mkdirSync(publisher);
  git(publisher, ["init", "-b", "main"]);
  git(publisher, ["config", "user.name", "Devix Test"]);
  git(publisher, ["config", "user.email", "devix@example.test"]);
  write(path.join(publisher, "package.json"), JSON.stringify({
    name: "kspay-devix",
    version: "9.9.0",
    private: true,
    bin: { devix: "bin/devix.js" },
  }, null, 2));
  write(path.join(publisher, "bin", "devix.js"), "#!/usr/bin/env node\nprocess.stdout.write('publisher cli\\n');\n");
  const publishedAgents = "# published agents\n\n## Change 事实落档与跨会话恢复\n\n禁止使用跨会话 memory。\n";
  write(path.join(publisher, "AGENTS.md"), publishedAgents);
  write(path.join(publisher, "standards", "README.md"), "# published standards\n");
  write(path.join(publisher, "standards", "new-rule.md"), "# new rule\n");
  for (const fileName of ["change.yaml", "README.md", "design.md", "tasks.md", "verification.md"]) {
    write(path.join(publisher, "templates", "change", fileName), `${fileName} published template\n`);
  }
  write(path.join(publisher, "changes", "must-not-copy.md"), "publisher change\n");
  git(publisher, ["add", "-A"]);
  git(publisher, ["commit", "-m", "publish rules"]);

  initializeWorkspace(workspace, { branch: "main" });
  write(path.join(workspace, "AGENTS.md"), "# local agents\n");
  write(path.join(workspace, "changes", "consumer.md"), "consumer change\n");
  write(path.join(workspace, "knowledge", "README.md"), "consumer knowledge\n");
  write(path.join(workspace, "repositories.yaml"), "schema_version: 1\nrepositories: [consumer]\n");
  write(path.join(workspace, ".devix", "runtime", "workspace-state.yaml"), "active_change_id: consumer\n");
  write(path.join(workspace, "repos", "consumer-repo", ".git", "HEAD"), "ref: refs/heads/feature/consumer\n");

  const toolHome = path.join(parent, "tool-home");
  const launcherPath = path.join(parent, "bin", "devix");
  const updateOptions = { sourceUrl: publisher, branch: "main", toolHome, launcherPath };
  const result = updateWorkspace(workspace, updateOptions);

  assert.equal(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), publishedAgents);
  assert.equal(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8").includes("Change 事实落档与跨会话恢复"), true);
  assert.equal(fs.readFileSync(path.join(workspace, "standards", "new-rule.md"), "utf8"), "# new rule\n");
  assert.equal(
    fs.readFileSync(path.join(workspace, ".devix", "templates", "change", "README.md"), "utf8"),
    "README.md published template\n",
  );
  assert.equal(fs.readFileSync(path.join(workspace, "changes", "consumer.md"), "utf8"), "consumer change\n");
  assert.equal(fs.existsSync(path.join(workspace, "changes", "must-not-copy.md")), false);
  assert.equal(fs.readFileSync(path.join(workspace, "knowledge", "README.md"), "utf8"), "consumer knowledge\n");
  assert.equal(fs.readFileSync(path.join(workspace, "repositories.yaml"), "utf8"), "schema_version: 1\nrepositories: [consumer]\n");
  assert.equal(fs.readFileSync(path.join(workspace, ".devix", "runtime", "workspace-state.yaml"), "utf8"), "active_change_id: consumer\n");
  assert.equal(
    fs.readFileSync(path.join(workspace, "repos", "consumer-repo", ".git", "HEAD"), "utf8"),
    "ref: refs/heads/feature/consumer\n",
  );
  assert.equal(result.git_commit_created, false);
  assert.equal(result.git_push_performed, false);
  assert.equal(result.cli.version, "9.9.0");
  assert.equal(result.cli.launcher_path, launcherPath);
  assert.equal(fs.lstatSync(path.join(toolHome, "current")).isSymbolicLink(), true);
  assert.equal(fs.readFileSync(launcherPath, "utf8").includes("Managed by devix update"), true);
  assert.equal(run(launcherPath, []).stdout, "publisher cli\n");
  createChangeFiles(workspace, "template-check", "Template Check", newManifest("template-check", "Template Check", []));
  assert.equal(
    fs.readFileSync(path.join(workspace, "changes", "template-check", "README.md"), "utf8"),
    "README.md published template\n",
  );
  assert.equal(git(workspace, ["rev-parse", "HEAD"], { allowFailure: true }).status, 128);
  assert.deepEqual(updateWorkspace(workspace, updateOptions).updated_files, []);

  const publishedAgentsV2 = publishedAgents.replace("# published agents", "# published agents v2");
  write(path.join(publisher, "AGENTS.md"), publishedAgentsV2);
  git(publisher, ["add", "AGENTS.md"]);
  git(publisher, ["commit", "-m", "publish rules v2"]);
  let output = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    output += chunk;
    return true;
  };
  try {
    await cliMain([
      "update", "--workspace", workspace, "--source", publisher, "--branch", "main",
      "--tool-home", toolHome, "--launcher-path", launcherPath,
    ]);
  } finally {
    process.stdout.write = originalWrite;
  }
  assert.equal(JSON.parse(output).updated_files.includes("AGENTS.md"), true);
  assert.equal(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), publishedAgentsV2);
  assert.throws(
    () => updateWorkspace(workspace, {
      sourceUrl: "https://user:token@example.test/devix.git",
      toolHome,
      launcherPath,
    }),
    (error) => error.code === "UPDATE_SOURCE_CONTAINS_CREDENTIALS",
  );
});

test("toolchain activation restores the previous version when launcher replacement fails", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "devix-toolchain-rollback-"));
  const toolHome = path.join(parent, "tool-home");
  const oldVersion = path.join(toolHome, "versions", "0.3.1-old");
  const newVersion = path.join(toolHome, "versions", "0.4.0-new");
  write(path.join(oldVersion, PACKAGE_ENTRY), "old\n");
  write(path.join(newVersion, PACKAGE_ENTRY), "new\n");
  fs.symlinkSync(oldVersion, path.join(toolHome, "current"), "dir");
  const invalidLauncherParent = path.join(parent, "launcher-parent-is-file");
  write(invalidLauncherParent, "not a directory\n");

  assert.throws(() => activateToolchain({
    toolHome,
    launcherPath: path.join(invalidLauncherParent, "devix"),
    version: "0.4.0",
    versionId: "0.4.0-new",
    versionRoot: newVersion,
    entry: path.join(newVersion, PACKAGE_ENTRY),
    installed: true,
    nodePath: process.execPath,
  }));
  assert.equal(fs.readlinkSync(path.join(toolHome, "current")), oldVersion);
});

test("repo add clones the declared base branch and writes the catalog", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "devix-repo-add-"));
  const source = path.join(parent, "source");
  const bare = path.join(parent, "source.git");
  const workspace = path.join(parent, "workspace");
  fs.mkdirSync(source);
  git(source, ["init", "-b", "main"]);
  git(source, ["config", "user.name", "Devix Test"]);
  git(source, ["config", "user.email", "devix@example.test"]);
  write(path.join(source, "AGENTS.md"), "# source rules\n");
  write(path.join(source, "README.md"), "source\n");
  git(source, ["add", "-A"]);
  git(source, ["commit", "-m", "initial"]);
  git(parent, ["clone", "--bare", source, bare]);
  initializeWorkspace(workspace, { branch: "main" });

  const result = addRepository(workspace, "source", { url: bare, baseBranch: "main" });

  assert.equal(result.branch, "main");
  assert.equal(result.codegraph.status, "missing");
  assert.deepEqual(result.agents, [path.join(workspace, "repos", "source", "AGENTS.md")]);
  const repositories = listRepositories(workspace);
  assert.equal(repositories.length, 1);
  assert.equal(repositories[0].url, bare);
  assert.equal(repositories[0].base_branch, "main");
  assert.equal(repositories[0].cloned, true);
  assert.throws(() => addRepository(workspace, "source", { url: bare, baseBranch: "main" }), (error) => {
    assert.equal(error.code, "REPOSITORY_EXISTS");
    return true;
  });
  assert.throws(() => addRepository(workspace, "secret", { url: "https://user:token@example.test/repo.git", baseBranch: "main" }), (error) => {
    assert.equal(error.code, "REPOSITORY_URL_CONTAINS_CREDENTIALS");
    return true;
  });
});

test("repository can be attached after clarification and activated safely", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createChange(root, "change-a", [], { status: "active" });
  setActive(root, "change-a");

  const context = addRepositories(root, "change-a", ["repo-a:main"]);

  assert.equal(currentBranch(repoPath), "feature/change-a");
  assert.equal(loadChange(root, "change-a").repositories[0].id, "repo-a");
  assert.equal(context.change_id, "change-a");
});

test("dirty active branch is saved as a local WIP commit before switching", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createFeature(repoPath, "feature/change-a");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a")], { status: "active" });
  createChange(root, "change-b", [repositoryManifest(root, "repo-a", "change-b")]);
  setActive(root, "change-a");
  write(path.join(repoPath, "module", "source.js"), "module.exports = 2;\n");
  write(path.join(repoPath, "new-file.txt"), "untracked\n");

  switchChange(root, "change-b");

  assert.equal(git(repoPath, ["branch", "--show-current"]).stdout.trim(), "feature/change-b");
  assert.equal(git(repoPath, ["log", "-1", "--format=%s", "feature/change-a"]).stdout.trim(), "WIP(devix): pause change-a");
  assert.equal(git(repoPath, ["show", "feature/change-a:new-file.txt"]).stdout, "untracked\n");
  const paused = loadChange(root, "change-a");
  assert.equal(paused.status, "paused");
  assert.equal(paused.repositories[0].snapshot.kind, "wip_commit");
  assert.equal(loadRuntimeState(root).active_change_id, "change-b");
});

test("branch mismatch aborts without committing or switching", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createFeature(repoPath, "feature/other");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a")], { status: "active" });
  createChange(root, "change-b", [repositoryManifest(root, "repo-a", "change-b")]);
  setActive(root, "change-a");
  write(path.join(repoPath, "dirty.txt"), "dirty\n");
  const before = head(repoPath);

  assert.throws(() => switchChange(root, "change-b"), (error) => {
    assert.equal(error.code, "WORKSPACE_CONFLICT");
    assert.equal(error.details.conflicts[0].reason, "branch_mismatch");
    return true;
  });
  assert.equal(head(repoPath), before);
  assert.equal(currentBranch(repoPath), "feature/other");
});

test("confirmed ordinary branch mismatch can be adopted and snapshotted", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createFeature(repoPath, "feature/manual-a");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a")], { status: "active" });
  createChange(root, "change-b", [repositoryManifest(root, "repo-a", "change-b")]);
  setActive(root, "change-a");
  write(path.join(repoPath, "dirty.txt"), "dirty\n");

  switchChange(root, "change-b", { adoptCurrentBranch: true });

  const paused = loadChange(root, "change-a");
  assert.equal(paused.repositories[0].feature_branch, "feature/manual-a");
  assert.equal(paused.repositories[0].snapshot.kind, "wip_commit");
  assert.equal(currentBranch(repoPath), "feature/change-b");
});

test("dirty protected branch never receives an automatic WIP commit", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a", { feature_branch: "main" })], { status: "active" });
  setActive(root, "change-a");
  write(path.join(repoPath, "dirty.txt"), "dirty\n");
  const before = head(repoPath);

  assert.throws(() => pauseChange(root, "change-a"), /需要确认/);
  assert.equal(head(repoPath), before);
  assert.equal(currentBranch(repoPath), "main");
});

test("commit hook failure keeps the current change active and does not checkout", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createFeature(repoPath, "feature/change-a");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a")], { status: "active" });
  createChange(root, "change-b", [repositoryManifest(root, "repo-a", "change-b")]);
  setActive(root, "change-a");
  write(path.join(repoPath, "dirty.txt"), "dirty\n");
  const hook = path.join(repoPath, ".git", "hooks", "pre-commit");
  write(hook, "#!/bin/sh\nexit 1\n");
  fs.chmodSync(hook, 0o755);
  const before = head(repoPath);

  assert.throws(() => switchChange(root, "change-b"), (error) => {
    assert.equal(error.code, "COMMAND_FAILED");
    return true;
  });
  assert.equal(head(repoPath), before);
  assert.equal(currentBranch(repoPath), "feature/change-a");
  assert.equal(loadRuntimeState(root).active_change_id, "change-a");
  assert.equal(loadChange(root, "change-a").status, "active");
});

test("invalid new change input does not pause the active change", () => {
  const root = makeWorkspace();
  createChange(root, "change-a", [], { status: "active" });
  createChange(root, "duplicate", []);
  setActive(root, "change-a");

  assert.throws(() => createAndActivateChange(root, "duplicate", "Duplicate"), (error) => {
    assert.equal(error.code, "CHANGE_EXISTS");
    return true;
  });
  assert.equal(loadRuntimeState(root).active_change_id, "change-a");
  assert.equal(loadChange(root, "change-a").status, "active");
});

test("multi-repository preflight failure prevents every WIP commit", () => {
  const root = makeWorkspace();
  const repoOne = initRepository(root, "repo-one");
  const repoTwo = initRepository(root, "repo-two");
  createFeature(repoOne, "feature/change-a");
  createFeature(repoTwo, "feature/unexpected");
  createChange(root, "change-a", [
    repositoryManifest(root, "repo-one", "change-a"),
    repositoryManifest(root, "repo-two", "change-a"),
  ], { status: "active" });
  setActive(root, "change-a");
  write(path.join(repoOne, "dirty.txt"), "dirty\n");
  const before = head(repoOne);

  assert.throws(() => pauseChange(root, "change-a"), /需要确认/);
  assert.equal(head(repoOne), before);
  assert.notEqual(git(repoOne, ["log", "-1", "--format=%s"]).stdout.trim(), "WIP(devix): pause change-a");
});

test("switch restores branch, context, AGENTS and CodeGraph sync", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a", { codegraph: true });
  createFeature(repoPath, "feature/change-a");
  const changeAHead = head(repoPath);
  git(repoPath, ["checkout", "-b", "feature/change-b", "main"]);
  const changeBHead = head(repoPath);
  write(path.join(root, "knowledge", "domain.md"), "domain knowledge\n");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a", { last_known_head: changeAHead })], {
    status: "paused",
    next_action: "resume A",
    resume: {
      context_summary: "A context",
      knowledge_status: "loaded",
      knowledge_sources: ["knowledge/domain.md"],
    },
  });
  createChange(root, "change-b", [repositoryManifest(root, "repo-a", "change-b", { last_known_head: changeBHead })], { status: "active" });
  setActive(root, "change-b");
  const binDir = installFakeCodeGraph(root);
  const logFile = path.join(root, "codegraph.log");
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}`, CODEGRAPH_LOG: logFile };

  const context = switchChange(root, "change-a", { env });

  assert.equal(currentBranch(repoPath), "feature/change-a");
  assert.equal(context.next_action, "resume A");
  assert.equal(context.context_summary, "A context");
  assert.deepEqual(context.knowledge_sources, [path.join(root, "knowledge", "domain.md")]);
  assert.deepEqual(context.missing_knowledge_sources, []);
  assert.ok(context.agents.includes(path.join(repoPath, "AGENTS.md")));
  assert.ok(context.agents.includes(path.join(repoPath, "module", "AGENTS.md")));
  assert.match(fs.readFileSync(logFile, "utf8"), new RegExp(`sync ${repoPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("CodeGraph sync failure blocks code analysis context", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a", { codegraph: true });
  createFeature(repoPath, "feature/change-a");
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a")], { status: "active" });
  setActive(root, "change-a");
  const binDir = installFailingCodeGraph(root);
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };

  assert.throws(() => switchChange(root, "change-a", { env }), (error) => {
    assert.equal(error.code, "CODEGRAPH_SYNC_FAILED");
    return true;
  });
  assert.equal(loadRuntimeState(root).active_change_id, "change-a");
});

test("repository paths outside repos are rejected before Git mutation", () => {
  const root = makeWorkspace();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "devix-outside-"));
  git(outside, ["init", "-b", "main"]);
  git(outside, ["config", "user.name", "Devix Test"]);
  git(outside, ["config", "user.email", "devix@example.test"]);
  write(path.join(outside, "file.txt"), "initial\n");
  git(outside, ["add", "-A"]);
  git(outside, ["commit", "-m", "initial"]);
  const repository = {
    id: "outside",
    local_path: path.relative(root, outside),
    base_branch: "main",
    feature_branch: "feature/change-a",
    workspace_mode: "checkout",
    worktree_path: "",
    modules: [],
    start_ref: head(outside),
    last_known_head: "",
    snapshot: null,
  };
  createChange(root, "change-a", [repository], { status: "active" });
  setActive(root, "change-a");
  const before = head(outside);

  assert.throws(() => pauseChange(root, "change-a"), (error) => {
    assert.equal(error.code, "REPOSITORY_PATH_OUTSIDE_WORKSPACE");
    return true;
  });
  assert.equal(head(outside), before);
});

test("HEAD drift blocks restoration without reset", () => {
  const root = makeWorkspace();
  const repoPath = initRepository(root, "repo-a");
  createFeature(repoPath, "feature/change-a");
  const recorded = head(repoPath);
  write(path.join(repoPath, "advance.txt"), "advance\n");
  git(repoPath, ["add", "-A"]);
  git(repoPath, ["commit", "-m", "unexpected advance"]);
  git(repoPath, ["checkout", "main"]);
  createChange(root, "change-a", [repositoryManifest(root, "repo-a", "change-a", { last_known_head: recorded })]);

  assert.throws(() => switchChange(root, "change-a"), (error) => {
    assert.equal(error.code, "WORKSPACE_CONFLICT");
    assert.equal(error.details.conflicts[0].reason, "head_drift");
    return true;
  });
  assert.equal(currentBranch(repoPath), "main");
});

test("design transition requires clarification gate and knowledge status", () => {
  const root = makeWorkspace();
  createChange(root, "change-a", []);
  let change = loadChange(root, "change-a");
  assert.throws(() => advanceChange(root, "change-a", "design"), /澄清 gate/);
  change.gates.clarification.status = "passed";
  saveChange(root, change);
  assert.throws(() => advanceChange(root, "change-a", "design"), /知识库/);
  change = loadChange(root, "change-a");
  change.resume.knowledge_status = "not_found";
  saveChange(root, change);
  assert.equal(advanceChange(root, "change-a", "design").phase, "design");
  assert.equal(validateChange(root, "change-a").valid, true);
});

function currentBranch(repoPath) {
  return git(repoPath, ["branch", "--show-current"]).stdout.trim();
}
