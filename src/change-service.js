const fs = require("node:fs");
const path = require("node:path");
const {
  CORE_CHANGE_FILES,
  changeDirectory,
  createChangeFiles,
  loadChange,
  loadConfig,
  loadRuntimeState,
  loadRepositoryCatalog,
  saveChange,
  saveRuntimeState,
} = require("./files");
const {
  assertRepository,
  branchExists,
  checkout,
  createWipCommit,
  currentBranch,
  head,
  resolveBaseBranch,
  resolveRepositoryPath,
  statusEntries,
  syncCodeGraph,
} = require("./git");
const { DevixError, WorkspaceConflictError } = require("./errors");

const PHASES = ["clarification", "design", "implementation", "verification", "closed"];
const STATUSES = ["active", "paused", "blocked", "done", "cancelled"];
const PROTECTED_BRANCHES = new Set(["main", "master"]);

function now() {
  return new Date().toISOString();
}

function repositoryState(root, repository) {
  const repoPath = resolveRepositoryPath(root, repository);
  assertRepository(repoPath, repository.id);
  return {
    repository,
    repoPath,
    actualBranch: currentBranch(repoPath),
    actualHead: head(repoPath),
    changes: statusEntries(repoPath),
  };
}

function preflightPause(root, change, options = {}) {
  const states = (change.repositories || []).map((repository) => repositoryState(root, repository));
  const conflicts = [];
  for (const state of states) {
    const expected = state.repository.feature_branch;
    const protectedBranch = state.actualBranch && PROTECTED_BRANCHES.has(state.actualBranch);
    if (!state.actualBranch) {
      conflicts.push({
        repo_id: state.repository.id,
        reason: "detached_head",
        expected_branch: expected,
        actual_branch: null,
        head: state.actualHead,
        changes: state.changes,
      });
      continue;
    }
    if (state.actualBranch !== expected) {
      if (options.adoptCurrentBranch && !protectedBranch) {
        state.repository.feature_branch = state.actualBranch;
      } else {
        conflicts.push({
          repo_id: state.repository.id,
          reason: protectedBranch ? "protected_branch" : "branch_mismatch",
          expected_branch: expected,
          actual_branch: state.actualBranch,
          head: state.actualHead,
          changes: state.changes,
        });
      }
      continue;
    }
    if (protectedBranch && state.changes.length > 0) {
      conflicts.push({
        repo_id: state.repository.id,
        reason: "protected_branch_dirty",
        expected_branch: expected,
        actual_branch: state.actualBranch,
        head: state.actualHead,
        changes: state.changes,
      });
    }
  }
  if (conflicts.length > 0) {
    throw new WorkspaceConflictError("当前代码现场与 change 记录不一致，需要确认后才能切换", {
      change_id: change.id,
      conflicts,
    });
  }
  return states;
}

function pauseChange(root, changeId, options = {}) {
  const config = loadConfig(root);
  const change = loadChange(root, changeId, config);
  const states = preflightPause(root, change, options);

  for (const state of states) {
    const snapshotTime = now();
    let commit = state.actualHead;
    let kind = "clean_head";
    if (state.changes.length > 0) {
      commit = createWipCommit(state.repoPath, change.id);
      kind = "wip_commit";
    } else if (state.repository.snapshot?.commit === state.actualHead) {
      kind = state.repository.snapshot.kind;
    }
    state.repository.last_known_head = commit;
    state.repository.snapshot = {
      kind,
      commit,
      created_at: snapshotTime,
    };
    saveChange(root, change, config);
  }

  change.status = "paused";
  change.resume = change.resume || {};
  change.resume.last_paused_at = now();
  saveChange(root, change, config);

  const runtime = loadRuntimeState(root);
  if (runtime.active_change_id === changeId) {
    runtime.active_change_id = null;
    runtime.updated_at = now();
    saveRuntimeState(root, runtime);
  }
  return change;
}

function preflightActivate(root, change) {
  const states = [];
  const conflicts = [];
  for (const repository of change.repositories || []) {
    const state = repositoryState(root, repository);
    if (state.changes.length > 0) {
      conflicts.push({
        repo_id: repository.id,
        reason: "target_repository_dirty",
        actual_branch: state.actualBranch,
        changes: state.changes,
      });
    }
    const targetExists = branchExists(state.repoPath, repository.feature_branch);
    const targetHead = targetExists ? head(state.repoPath, repository.feature_branch) : null;
    if (repository.last_known_head && targetHead !== repository.last_known_head) {
      conflicts.push({
        repo_id: repository.id,
        reason: "head_drift",
        feature_branch: repository.feature_branch,
        expected_head: repository.last_known_head,
        actual_head: targetHead,
      });
    }
    if (!targetExists && !branchExists(state.repoPath, repository.base_branch)) {
      conflicts.push({
        repo_id: repository.id,
        reason: "base_branch_missing",
        base_branch: repository.base_branch,
      });
    }
    states.push({ ...state, targetExists });
  }
  if (conflicts.length > 0) {
    throw new WorkspaceConflictError("目标 change 的代码现场无法安全激活", {
      change_id: change.id,
      conflicts,
    });
  }
  return states;
}

function rollbackCheckouts(states, switched) {
  for (const state of [...switched].reverse()) {
    if (state.actualBranch) {
      checkout(state.repoPath, state.actualBranch, state.actualBranch);
    } else if (state.actualHead) {
      const { git } = require("./git");
      git(state.repoPath, ["checkout", "--detach", state.actualHead]);
    }
  }
}

function collectAgents(repoPath, modules = []) {
  const files = new Set();
  const candidates = modules.length > 0 ? modules : [""];
  for (const modulePath of candidates) {
    let current = path.resolve(repoPath, modulePath);
    const relative = path.relative(repoPath, current);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new DevixError("MODULE_PATH_OUTSIDE_REPOSITORY", `模块路径超出仓库：${modulePath}`, {
        repo_path: repoPath,
      });
    }
    if (fs.existsSync(current) && fs.statSync(current).isFile()) {
      current = path.dirname(current);
    }
    while (current.startsWith(repoPath)) {
      const agent = path.join(current, "AGENTS.md");
      if (fs.existsSync(agent)) {
        files.add(agent);
      }
      if (current === repoPath) break;
      current = path.dirname(current);
    }
  }
  return [...files].sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
}

function buildContext(root, change, codegraph = []) {
  const config = loadConfig(root);
  const directory = changeDirectory(root, change.id, config);
  const core_files = CORE_CHANGE_FILES
    .map((name) => path.join(directory, name))
    .filter((file) => fs.existsSync(file));
  const optional_files = [path.join(directory, "decisions.md")].filter((file) => fs.existsSync(file));
  const knowledge_sources = (change.resume?.knowledge_sources || []).map((source) =>
    path.isAbsolute(source) ? source : path.resolve(root, source),
  );
  const agents = [];
  for (const repository of change.repositories || []) {
    const repoPath = resolveRepositoryPath(root, repository);
    agents.push(...collectAgents(repoPath, repository.modules || []));
  }
  return {
    change_id: change.id,
    phase: change.phase,
    status: change.status,
    next_action: change.next_action,
    context_summary: change.resume?.context_summary || "",
    core_files,
    optional_files,
    knowledge_sources,
    missing_knowledge_sources: knowledge_sources.filter((source) => !fs.existsSync(source)),
    agents: [...new Set(agents)],
    codegraph,
  };
}

function activateChange(root, changeId, options = {}) {
  const config = loadConfig(root);
  const change = loadChange(root, changeId, config);
  const states = preflightActivate(root, change);
  const switched = [];
  try {
    for (const state of states) {
      checkout(state.repoPath, state.repository.feature_branch, state.repository.base_branch);
      switched.push(state);
      state.repository.last_known_head = head(state.repoPath);
    }
  } catch (error) {
    rollbackCheckouts(states, switched);
    throw error;
  }

  const codegraph = states.map((state) => syncCodeGraph(state.repoPath, options.env));
  change.status = "active";
  change.resume = change.resume || {};
  change.resume.last_activated_at = now();
  saveChange(root, change, config);
  saveRuntimeState(root, {
    schema_version: 1,
    active_change_id: change.id,
    updated_at: now(),
  });
  const context = buildContext(root, change, codegraph);
  const failures = codegraph.filter((item) => item.status === "failed");
  if (failures.length > 0) {
    throw new DevixError(
      "CODEGRAPH_SYNC_FAILED",
      "change 已激活，但 CodeGraph 同步失败；不得使用旧索引分析代码",
      { context, failures },
    );
  }
  return context;
}

function switchChange(root, targetId, options = {}) {
  const runtime = loadRuntimeState(root);
  if (runtime.active_change_id && runtime.active_change_id !== targetId) {
    pauseChange(root, runtime.active_change_id, options);
  }
  if (runtime.active_change_id === targetId) {
    const change = loadChange(root, targetId);
    preflightPause(root, change, options);
    const codegraph = (change.repositories || []).map((repository) =>
      syncCodeGraph(resolveRepositoryPath(root, repository), options.env),
    );
    const context = buildContext(root, change, codegraph);
    const failures = codegraph.filter((item) => item.status === "failed");
    if (failures.length > 0) {
      throw new DevixError(
        "CODEGRAPH_SYNC_FAILED",
        "CodeGraph 同步失败；不得使用旧索引分析代码",
        { context, failures },
      );
    }
    return context;
  }
  return activateChange(root, targetId, options);
}

function parseRepoSpec(root, changeId, spec) {
  const [id, baseOverride] = spec.split(":");
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) {
    throw new DevixError("REPOSITORY_SPEC_INVALID", `仓库参数无效：${spec}`);
  }
  const catalog = loadRepositoryCatalog(root);
  const registered = (catalog.repositories || []).find((repository) => repository.id === id);
  const localPath = registered?.local_path || path.join("repos", id);
  const repoPath = path.resolve(root, localPath);
  assertRepository(repoPath, id);
  const baseBranch = baseOverride || registered?.base_branch || resolveBaseBranch(repoPath);
  return {
    id,
    local_path: localPath,
    base_branch: baseBranch,
    feature_branch: `feature/${changeId}`,
    workspace_mode: "checkout",
    worktree_path: "",
    modules: [],
    start_ref: head(repoPath, baseBranch),
    last_known_head: "",
    snapshot: null,
  };
}

function newManifest(changeId, title, repositories) {
  const timestamp = now();
  return {
    schema_version: 1,
    id: changeId,
    title,
    type: "feature",
    owner: "",
    created_at: timestamp,
    updated_at: timestamp,
    phase: "clarification",
    status: "paused",
    next_action: "完成需求澄清，并在进入方案设计前读取相关知识库",
    sources: [],
    resume: {
      context_summary: "",
      knowledge_status: "pending",
      knowledge_sources: [],
      last_paused_at: null,
      last_activated_at: null,
    },
    repositories,
    gates: {
      clarification: { status: "pending", reviewer: "", evidence: "" },
      design_review: { status: "pending", reviewer: "", evidence: "" },
      verification: { status: "pending", reviewer: "", evidence: "" },
    },
    blockers: [],
  };
}

function createAndActivateChange(root, changeId, title, repoSpecs = [], options = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(changeId)) {
    throw new DevixError("CHANGE_ID_INVALID", `change-id 必须使用小写字母、数字和连字符：${changeId}`);
  }
  const config = loadConfig(root);
  if (fs.existsSync(changeDirectory(root, changeId, config))) {
    throw new DevixError("CHANGE_EXISTS", `change 已存在：${changeId}`);
  }
  const repositories = repoSpecs.map((spec) => parseRepoSpec(root, changeId, spec));
  const runtime = loadRuntimeState(root);
  if (runtime.active_change_id) {
    pauseChange(root, runtime.active_change_id, options);
  }
  const manifest = newManifest(changeId, title, repositories);
  createChangeFiles(root, changeId, title, manifest);
  return activateChange(root, changeId, options);
}

function addRepositories(root, changeId, repoSpecs, options = {}) {
  if (!repoSpecs || repoSpecs.length === 0) {
    throw new DevixError("REPOSITORY_SPEC_REQUIRED", "至少提供一个 --repo");
  }
  const change = loadChange(root, changeId);
  const runtime = loadRuntimeState(root);
  if (runtime.active_change_id && runtime.active_change_id !== changeId) {
    throw new WorkspaceConflictError("不能给非 active change 激活代码仓库", {
      active_change_id: runtime.active_change_id,
      target_change_id: changeId,
    });
  }
  const existingIds = new Set((change.repositories || []).map((repository) => repository.id));
  const repositories = repoSpecs.map((spec) => parseRepoSpec(root, changeId, spec));
  const duplicate = repositories.find((repository) => existingIds.has(repository.id));
  if (duplicate) {
    throw new DevixError("REPOSITORY_EXISTS", `change 已包含仓库：${duplicate.id}`);
  }

  if (runtime.active_change_id === changeId) {
    const states = preflightActivate(root, { ...change, repositories });
    const switched = [];
    try {
      for (const state of states) {
        checkout(state.repoPath, state.repository.feature_branch, state.repository.base_branch);
        switched.push(state);
        state.repository.last_known_head = head(state.repoPath);
      }
    } catch (error) {
      rollbackCheckouts(states, switched);
      throw error;
    }
    const codegraph = states.map((state) => syncCodeGraph(state.repoPath, options.env));
    change.repositories = [...(change.repositories || []), ...repositories];
    saveChange(root, change);
    const context = buildContext(root, change, codegraph);
    const failures = codegraph.filter((item) => item.status === "failed");
    if (failures.length > 0) {
      throw new DevixError(
        "CODEGRAPH_SYNC_FAILED",
        "仓库已加入 active change，但 CodeGraph 同步失败；不得使用旧索引分析代码",
        { context, failures },
      );
    }
    return context;
  }

  change.repositories = [...(change.repositories || []), ...repositories];
  saveChange(root, change);
  return buildContext(root, change);
}

function validateChange(root, changeId) {
  const config = loadConfig(root);
  const change = loadChange(root, changeId, config);
  const directory = changeDirectory(root, changeId, config);
  const errors = [];
  for (const name of CORE_CHANGE_FILES) {
    if (!fs.existsSync(path.join(directory, name))) {
      errors.push(`缺少核心文件：${name}`);
    }
  }
  if (!PHASES.includes(change.phase)) errors.push(`非法阶段：${change.phase}`);
  if (!STATUSES.includes(change.status)) errors.push(`非法状态：${change.status}`);
  if (change.id !== changeId) errors.push(`目录与 change.id 不一致：${change.id}`);
  for (const repository of change.repositories || []) {
    for (const key of ["id", "local_path", "base_branch", "feature_branch"]) {
      if (!repository[key]) errors.push(`仓库 ${repository.id || "<unknown>"} 缺少 ${key}`);
    }
  }
  if (PHASES.indexOf(change.phase) >= PHASES.indexOf("design")) {
    const knowledgeStatus = change.resume?.knowledge_status;
    if (!["loaded", "not_found"].includes(knowledgeStatus)) {
      errors.push("进入 design 前必须完成知识库读取，并设置 knowledge_status=loaded 或 not_found");
    }
  }
  return { valid: errors.length === 0, change_id: changeId, errors };
}

function advanceChange(root, changeId, targetPhase) {
  const change = loadChange(root, changeId);
  const currentIndex = PHASES.indexOf(change.phase);
  const targetIndex = PHASES.indexOf(targetPhase);
  if (targetIndex !== currentIndex + 1) {
    throw new DevixError("PHASE_TRANSITION_INVALID", `只允许进入下一个阶段：${change.phase} → ${PHASES[currentIndex + 1] || "<none>"}`);
  }
  if (targetPhase === "design") {
    if (change.gates?.clarification?.status !== "passed") {
      throw new DevixError("GATE_PENDING", "需求澄清 gate 尚未通过");
    }
    if (!["loaded", "not_found"].includes(change.resume?.knowledge_status)) {
      throw new DevixError("KNOWLEDGE_PENDING", "进入 design 前必须读取知识库或明确记录 not_found");
    }
  }
  if (targetPhase === "implementation" && change.gates?.design_review?.status !== "passed") {
    throw new DevixError("GATE_PENDING", "技术方案评审 gate 尚未通过");
  }
  if (targetPhase === "closed" && change.gates?.verification?.status !== "passed") {
    throw new DevixError("GATE_PENDING", "验证 gate 尚未通过");
  }
  change.phase = targetPhase;
  if (targetPhase === "closed") change.status = "done";
  saveChange(root, change);
  return change;
}

function changeStatus(root, changeId = null) {
  const runtime = loadRuntimeState(root);
  const id = changeId || runtime.active_change_id;
  if (!id) {
    return { active_change_id: null };
  }
  const change = loadChange(root, id);
  const repositories = (change.repositories || []).map((repository) => {
    const state = repositoryState(root, repository);
    return {
      id: repository.id,
      expected_branch: repository.feature_branch,
      actual_branch: state.actualBranch,
      head: state.actualHead,
      dirty: state.changes.length > 0,
      changes: state.changes,
    };
  });
  return {
    active_change_id: runtime.active_change_id,
    change_id: id,
    phase: change.phase,
    status: change.status,
    next_action: change.next_action,
    repositories,
  };
}

module.exports = {
  PHASES,
  STATUSES,
  activateChange,
  addRepositories,
  advanceChange,
  buildContext,
  changeStatus,
  createAndActivateChange,
  newManifest,
  pauseChange,
  preflightActivate,
  preflightPause,
  switchChange,
  validateChange,
};
