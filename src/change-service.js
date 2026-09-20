const fs = require("node:fs");
const path = require("node:path");
const {
  CURRENT_CHANGE_SCHEMA_VERSION,
  changeDirectory,
  coreChangeFilesForSchema,
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
const RELEASE_IMPACTS = ["pending", "none", "required"];
const RELEASE_STATUSES = ["pending", "planning", "ready", "in_progress", "completed", "not_required"];
const RELEASE_ENVIRONMENTS = ["staging", "prt", "prod"];
const GATE_STATUSES = ["pending", "passed", "failed", "waived"];
const PROTECTED_BRANCHES = new Set(["main", "master"]);

function now() {
  return new Date().toISOString();
}

function isTerminal(change) {
  return change.phase === "closed" || ["done", "cancelled"].includes(change.status) || Boolean(change.archive);
}

function assertChangeOpen(change) {
  if (isTerminal(change)) {
    throw new DevixError("CHANGE_TERMINATED", `需求已结束或归档，不能继续执行：${change.id}`, {
      phase: change.phase, status: change.status, archive: change.archive || null,
    });
  }
}

function clearActiveChange(root, changeId) {
  const runtime = loadRuntimeState(root);
  if (runtime.active_change_id === changeId) {
    runtime.active_change_id = null;
    runtime.updated_at = now();
    saveRuntimeState(root, runtime);
  }
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
  assertChangeOpen(change);
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

  clearActiveChange(root, changeId);
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
  const coreFiles = coreChangeFilesForSchema(change.schema_version);
  const core_files = coreFiles
    .map((name) => path.join(directory, name))
    .filter((file) => fs.existsSync(file));
  const optionalFileNames = ["decisions.md", "design-review.md"];
  if (change.schema_version === 1) optionalFileNames.push("release.md");
  const optional_files = optionalFileNames
    .map((name) => path.join(directory, name))
    .filter((file) => fs.existsSync(file));
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
  assertChangeOpen(change);
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
  assertChangeOpen(loadChange(root, targetId));
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
    schema_version: CURRENT_CHANGE_SCHEMA_VERSION,
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
    artifacts: {
      design_review: true,
    },
    release: {
      impact: "pending",
      status: "pending",
      environments: [...RELEASE_ENVIRONMENTS],
      document: "release.md",
    },
    gates: {
      clarification: { status: "pending", reviewer: "", evidence: "" },
      design_review: { status: "pending", reviewer: "", evidence: "" },
      release_readiness: { status: "pending", reviewer: "", evidence: "" },
      verification: { status: "pending", reviewer: "", evidence: "" },
    },
    blockers: [],
    structured_workflow: false,
    revisions: [],
    revision_state: null,
    cancellation: null,
    archive: null,
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
  if (options.includeDecisions) manifest.include_decisions = true;
  createChangeFiles(root, changeId, title, manifest);
  return activateChange(root, changeId, options);
}

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `change-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
}

function appendDocumentSection(filePath, heading, body) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  content = `${content.trimEnd()}\n\n${heading}\n\n${body.trim()}\n`;
  fs.writeFileSync(filePath, `${content.trimEnd()}\n`, "utf8");
}

function intakeChange(root, options = {}) {
  const title = String(options.title || "").trim();
  const description = String(options.description || "").trim();
  if (!title && !description) {
    throw new DevixError("INTAKE_INPUT_REQUIRED", "需求 intake 至少需要 title 或 description");
  }
  if (Array.isArray(options.repoSpecs) && options.repoSpecs.length > 0) {
    throw new DevixError(
      "INTAKE_REPOSITORY_FORBIDDEN",
      "需求 intake 阶段不能指定仓库；完成只读设计勘察后使用 change repo-add 关联实际影响仓库",
    );
  }
  const changeId = options.changeId || slugify(title || description);
  const config = loadConfig(root);
  if (fs.existsSync(changeDirectory(root, changeId, config))) {
    throw new DevixError("CHANGE_EXISTS", `change 已存在：${changeId}`);
  }
  const runtime = loadRuntimeState(root);
  if (runtime.active_change_id) pauseChange(root, runtime.active_change_id, options);
  const manifest = newManifest(changeId, title || changeId, []);
  manifest.include_decisions = true;
  createChangeFiles(root, changeId, title || changeId, manifest);
  const change = loadChange(root, changeId, config);
  change.structured_workflow = true;
  change.sources = [...new Set([...(change.sources || []), ...(Array.isArray(options.sources) ? options.sources : options.source ? [options.source] : [])])];
  change.resume = change.resume || {};
  change.resume.context_summary = `已完成需求 intake，当前处于 clarification。正式需求见 README.md，决策见 decisions.md，发布影响见 release.md。`;
  saveChange(root, change, config);
  const directory = changeDirectory(root, changeId, config);
  if (description) {
    appendDocumentSection(path.join(directory, "README.md"), "## Intake 记录", description);
  }
  if (options.openDecision || options.assumption) {
    const decisionsPath = path.join(directory, "decisions.md");
    const rows = [];
    if (options.openDecision) rows.push(`- ${options.openDecision}`);
    if (options.assumption) rows.push(`- ${options.assumption}`);
    appendDocumentSection(decisionsPath, "### Intake 待确认项", rows.join("\n"));
  }
  return { ...buildContext(root, change), change_id: changeId, phase: "clarification", status: "paused", sources: change.sources, context_summary: change.resume.context_summary };
}

function ensureDecisionsFile(root, changeId, config) {
  const filePath = path.join(changeDirectory(root, changeId, config), "decisions.md");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "## Open Decisions\n\n## Confirmed Decisions\n\n## Assumptions\n", "utf8");
  }
  return filePath;
}

function reviseChange(root, changeId, mode, summary, options = {}) {
  const allowed = new Set(["local", "delta", "major"]);
  if (!allowed.has(mode)) throw new DevixError("REVISION_MODE_INVALID", `不支持的增量变更类型：${mode}`);
  if (!String(summary || "").trim()) throw new DevixError("REVISION_SUMMARY_REQUIRED", "增量变更必须说明内容");
  const config = loadConfig(root);
  const change = loadChange(root, changeId, config);
  assertChangeOpen(change);
  if (mode !== "major" && change.phase !== "implementation") {
    throw new DevixError("REVISION_PHASE_INVALID", `${mode} 增量只能在 implementation 阶段处理，当前为 ${change.phase}`);
  }
  change.gates = change.gates || {
    clarification: { status: "pending", reviewer: "", evidence: "" },
    design_review: { status: "pending", reviewer: "", evidence: "" },
    release_readiness: { status: "pending", reviewer: "", evidence: "" },
    verification: { status: "pending", reviewer: "", evidence: "" },
  };
  const directory = changeDirectory(root, changeId, config);
  const timestamp = now();
  const requiresConfirmation = mode !== "local";
  change.revisions = change.revisions || [];
  const pendingRevision = options.confirm && change.revision_state?.status === "pending_confirmation" && change.revision_state.mode === mode && change.revision_state.summary === String(summary).trim()
    ? change.revision_state
    : null;
  const revision = pendingRevision ? { ...pendingRevision, status: "confirmed" } : {
    id: `REV-${change.revisions.length + 1}`,
    mode,
    summary: String(summary).trim(),
    created_at: timestamp,
    status: !requiresConfirmation || options.confirm ? "confirmed" : "pending_confirmation",
    affected_documents: mode === "local" ? ["tasks.md"] : mode === "delta" ? ["README.md", "design.md", "design-review.md", "decisions.md", "tasks.md", "release.md"] : ["README.md", "design.md", "design-review.md", "decisions.md", "tasks.md", "release.md", "verification.md"],
  };
  if (options.confirm && requiresConfirmation) {
    if (!options.reviewer || !options.evidence) {
      throw new DevixError("REVISION_CONFIRMATION_EVIDENCE_REQUIRED", "确认增量变更必须提供 reviewer 和 evidence");
    }
    revision.reviewer = options.reviewer;
    revision.evidence = options.evidence;
  }
  if (pendingRevision) {
    const index = change.revisions.findIndex((item) => item.id === revision.id);
    if (index >= 0) change.revisions[index] = revision;
  } else {
    change.revisions.push(revision);
  }
  change.revision_state = revision;
  const revisionHeading = `### ${revision.id} ${mode.toUpperCase()} (${timestamp})`;
  if (!pendingRevision) {
    appendDocumentSection(path.join(directory, "README.md"), "## 增量变更记录", `${revisionHeading}\n\n${revision.summary}`);
    appendDocumentSection(path.join(directory, "tasks.md"), "## 增量任务记录", `${revisionHeading}\n\n- ${revision.summary}\n- 状态：${revision.status}`);
  }
  if (mode !== "local") {
    const decisionsPath = ensureDecisionsFile(root, changeId, config);
    const decisionsHeading = revision.status === "confirmed" ? "## Confirmed Decisions" : "## Open Decisions";
    if (!pendingRevision || revision.status === "confirmed") {
      appendDocumentSection(decisionsPath, decisionsHeading, `${revisionHeading}\n\n- ${revision.status === "confirmed" ? "已确认" : "需要确认"}：${revision.summary}\n- 状态：${revision.status}`);
    }
    if (!pendingRevision) appendDocumentSection(path.join(directory, "release.md"), "## 增量变更影响", `${revisionHeading}\n\n- 发布影响待根据本次变更重新判断：${revision.summary}`);
    if (mode === "major") {
      change.phase = "clarification";
      change.status = "active";
      change.next_action = "重新澄清重大增量变更，并重审受影响的技术方案";
      change.gates.clarification = { status: "pending", reviewer: "", evidence: "" };
    } else {
      change.phase = "implementation";
      change.status = options.confirm ? "active" : "blocked";
      change.next_action = options.confirm ? "按增量方案继续代码实现" : "等待用户确认增量变更后再继续代码实现";
    }
    change.gates.design_review = { status: options.confirm && mode === "delta" ? "passed" : "pending", reviewer: options.confirm && mode === "delta" ? options.reviewer : "", evidence: options.confirm && mode === "delta" ? options.evidence : "" };
    change.gates.release_readiness = { status: "pending", reviewer: "", evidence: "" };
    change.gates.verification = { status: "pending", reviewer: "", evidence: "" };
  } else {
    change.status = "active";
    change.next_action = "继续代码实现，并在 tasks.md 记录局部实现变更";
  }
  change.resume = change.resume || {};
  change.resume.context_summary = `最近变更 ${revision.id}（${mode}）：${revision.summary}`;
  saveChange(root, change, config);
  return { change_id: changeId, revision, phase: change.phase, status: change.status, gates: change.gates };
}

function addRepositories(root, changeId, repoSpecs, options = {}) {
  if (!repoSpecs || repoSpecs.length === 0) {
    throw new DevixError("REPOSITORY_SPEC_REQUIRED", "至少提供一个 --repo");
  }
  const change = loadChange(root, changeId);
  assertChangeOpen(change);
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

function templateMatches(root, changeId, name, config) {
  const directory = changeDirectory(root, changeId, config);
  const workspaceTemplate = path.join(root, ".devix", "templates", "change", name);
  const packageTemplate = path.resolve(__dirname, "..", "templates", "change", name);
  const template = fs.existsSync(workspaceTemplate) ? workspaceTemplate : packageTemplate;
  if (!fs.existsSync(template) || !fs.existsSync(path.join(directory, name))) return false;
  let expected = fs.readFileSync(template, "utf8");
  expected = expected.split("replace-with-change-id").join(changeId);
  const change = loadChange(root, changeId, config);
  expected = expected.split("替换为需求名称").join(change.title);
  expected = expected.split("# 需求名称").join(`# ${change.title}`);
  return fs.readFileSync(path.join(directory, name), "utf8") === expected;
}

function validateStrictArtifacts(root, change, directory, errors, config) {
  if (change.schema_version !== 2) return;
  const decisionsPath = path.join(directory, "decisions.md");
  if (change.structured_workflow && !fs.existsSync(decisionsPath)) errors.push("strict 模式要求 structured change 创建 decisions.md");
  if (change.structured_workflow && fs.existsSync(decisionsPath)) {
    const decisions = fs.readFileSync(decisionsPath, "utf8");
    for (const heading of ["## Open Decisions", "## Confirmed Decisions", "## Assumptions"]) {
      if (!decisions.includes(heading)) errors.push(`decisions.md 缺少固定章节：${heading}`);
    }
  }
  if (change.artifacts?.design_review === true) {
    const reviewPath = path.join(directory, "design-review.md");
    if (!fs.existsSync(reviewPath)) errors.push("启用 design_review 产物的 change 缺少 design-review.md");
    if (change.phase === "clarification" && !templateMatches(root, change.id, "design-review.md", config)) {
      errors.push("clarification 阶段不允许提前修改：design-review.md");
    }
  }
  if (change.status === "cancelled") return;
  if (change.phase === "clarification") {
    for (const name of ["design.md", "tasks.md", "verification.md"]) {
      if (!templateMatches(root, change.id, name, config)) errors.push(`clarification 阶段不允许提前修改：${name}`);
    }
  } else if (change.phase === "design" && !templateMatches(root, change.id, "verification.md", config)) {
    errors.push("design 阶段不允许提前填写 verification.md");
  }
  if (change.revision_state?.status === "pending_confirmation") {
    errors.push("存在待用户确认的增量变更");
  }
}

function validateChange(root, changeId, options = {}) {
  const config = loadConfig(root);
  const change = loadChange(root, changeId, config);
  const directory = changeDirectory(root, changeId, config);
  const errors = [];
  let coreFiles = [];
  try {
    coreFiles = coreChangeFilesForSchema(change.schema_version);
  } catch (error) {
    errors.push(error.message);
  }
  for (const name of coreFiles) {
    if (!fs.existsSync(path.join(directory, name))) {
      errors.push(`缺少核心文件：${name}`);
    }
  }
  if (!PHASES.includes(change.phase)) errors.push(`非法阶段：${change.phase}`);
  if (!STATUSES.includes(change.status)) errors.push(`非法状态：${change.status}`);
  if (change.id !== changeId) errors.push(`目录与 change.id 不一致：${change.id}`);
  for (const key of ["cancellation", "archive"]) {
    const record = change[key];
    if (record == null) continue;
    if (!record.reason?.trim?.() || !record.reviewer?.trim?.() || !record.at || Number.isNaN(Date.parse(record.at))) {
      errors.push(`${key} 必须记录 reason、reviewer 和有效 at 时间`);
    }
  }
  if (change.cancellation && change.status !== "cancelled") errors.push("cancellation 仅允许用于 cancelled 需求");
  if (change.archive && change.status !== "cancelled" && !(change.phase === "closed" && change.status === "done")) {
    errors.push("仅 cancelled 或 closed/done 需求允许归档");
  }
  if (change.schema_version === CURRENT_CHANGE_SCHEMA_VERSION) {
    validateReleaseState(change, errors);
  }
  for (const repository of change.repositories || []) {
    for (const key of ["id", "local_path", "base_branch", "feature_branch"]) {
      if (!repository[key]) errors.push(`仓库 ${repository.id || "<unknown>"} 缺少 ${key}`);
    }
  }
  if (change.status !== "cancelled" && PHASES.indexOf(change.phase) >= PHASES.indexOf("design")) {
    const knowledgeStatus = change.resume?.knowledge_status;
    if (!["loaded", "not_found"].includes(knowledgeStatus)) {
      errors.push("进入 design 前必须完成知识库读取，并设置 knowledge_status=loaded 或 not_found");
    }
  }
  if (options.strict) validateStrictArtifacts(root, change, directory, errors, config);
  return { valid: errors.length === 0, change_id: changeId, errors };
}

function hasGateEvidence(gate) {
  return Boolean(gate?.reviewer?.trim?.() && gate?.evidence?.trim?.());
}

function validateReleaseState(change, errors) {
  const release = change.release || {};
  const gate = change.gates?.release_readiness || {};
  if (!RELEASE_IMPACTS.includes(release.impact)) errors.push(`非法 release.impact：${release.impact}`);
  if (!RELEASE_STATUSES.includes(release.status)) errors.push(`非法 release.status：${release.status}`);
  if (JSON.stringify(release.environments) !== JSON.stringify(RELEASE_ENVIRONMENTS)) {
    errors.push("release.environments 必须依次为 staging、prt、prod");
  }
  if (release.document !== "release.md") errors.push("release.document 必须为 release.md");
  if (!GATE_STATUSES.includes(gate.status)) errors.push(`非法 release_readiness gate：${gate.status}`);
  if (["passed", "waived"].includes(gate.status) && !hasGateEvidence(gate)) {
    errors.push("release_readiness gate 为 passed/waived 时必须填写 reviewer 和 evidence");
  }

  if (change.status !== "cancelled" && PHASES.indexOf(change.phase) >= PHASES.indexOf("verification")) {
    if (release.impact === "required") {
      if (!["ready", "in_progress", "completed"].includes(release.status) || gate.status !== "passed") {
        errors.push("有发布影响的 change 进入 verification 后必须通过发布准备门禁并处于 ready/in_progress/completed");
      }
    } else if (release.impact === "none") {
      if (release.status !== "not_required" || gate.status !== "waived") {
        errors.push("无发布影响的 change 进入 verification 后必须标记 not_required 并豁免发布准备门禁");
      }
    } else {
      errors.push("进入 verification 前必须确定 release.impact");
    }
  }
  if (change.phase === "closed" && release.impact === "required" && release.status !== "completed") {
    errors.push("有发布影响的 change 关闭前必须完成发布及上线后事项");
  }
}

function assertReleaseReadiness(change) {
  if (change.schema_version === 1) return;
  if (change.schema_version !== CURRENT_CHANGE_SCHEMA_VERSION) {
    throw new DevixError("CHANGE_SCHEMA_UNSUPPORTED", `不支持的 change schema_version：${change.schema_version}`);
  }
  const release = change.release || {};
  const gate = change.gates?.release_readiness || {};
  if (release.impact === "required") {
    if (release.status !== "ready" || gate.status !== "passed" || !hasGateEvidence(gate)) {
      throw new DevixError(
        "RELEASE_READINESS_PENDING",
        "有发布影响的 change 进入 verification 前必须设置 release.status=ready，并由确认人通过 release_readiness gate",
      );
    }
    return;
  }
  if (release.impact === "none") {
    if (release.status !== "not_required" || gate.status !== "waived" || !hasGateEvidence(gate)) {
      throw new DevixError(
        "RELEASE_READINESS_PENDING",
        "无发布影响的 change 进入 verification 前必须设置 release.status=not_required，并由确认人豁免 release_readiness gate",
      );
    }
    return;
  }
  throw new DevixError("RELEASE_IMPACT_PENDING", "进入 verification 前必须确定 release.impact 为 required 或 none");
}

function assertReleaseCompleted(change) {
  if (change.schema_version === 1) return;
  if (change.schema_version !== CURRENT_CHANGE_SCHEMA_VERSION) {
    throw new DevixError("CHANGE_SCHEMA_UNSUPPORTED", `不支持的 change schema_version：${change.schema_version}`);
  }
  const release = change.release || {};
  if (release.impact === "required" && release.status !== "completed") {
    throw new DevixError("RELEASE_INCOMPLETE", "有发布影响的 change 关闭前必须完成发布及上线后事项");
  }
  if (release.impact === "none" && release.status !== "not_required") {
    throw new DevixError("RELEASE_STATE_INVALID", "无发布影响的 change 关闭时必须保持 release.status=not_required");
  }
  if (!RELEASE_IMPACTS.includes(release.impact) || release.impact === "pending") {
    throw new DevixError("RELEASE_IMPACT_PENDING", "关闭 change 前必须确定 release.impact");
  }
}

function advanceChange(root, changeId, targetPhase) {
  const change = loadChange(root, changeId);
  assertChangeOpen(change);
  if (change.revision_state?.status === "pending_confirmation") {
    throw new DevixError("REVISION_CONFIRMATION_PENDING", "存在待用户确认的增量变更，不能推进阶段");
  }
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
  if (targetPhase === "verification") assertReleaseReadiness(change);
  if (targetPhase === "closed" && change.gates?.verification?.status !== "passed") {
    throw new DevixError("GATE_PENDING", "验证 gate 尚未通过");
  }
  if (targetPhase === "closed") assertReleaseCompleted(change);
  change.phase = targetPhase;
  if (targetPhase === "closed") change.status = "done";
  saveChange(root, change);
  if (targetPhase === "closed") clearActiveChange(root, changeId);
  return change;
}

function terminationRecord(options) {
  const reason = String(options.reason || "").trim();
  const reviewer = String(options.reviewer || "").trim();
  if (!reason || !reviewer) {
    throw new DevixError("TERMINATION_EVIDENCE_REQUIRED", "取消或归档必须提供 --reason 和 --reviewer");
  }
  return { reason, reviewer, at: now() };
}

function cancelChange(root, changeId, options = {}) {
  const record = terminationRecord(options);
  let change = loadChange(root, changeId);
  if (change.status === "cancelled") {
    clearActiveChange(root, changeId);
    return options.archive ? archiveChange(root, changeId, options) : change;
  }
  assertChangeOpen(change);
  const directory = changeDirectory(root, changeId);
  const tasksPath = path.join(directory, "tasks.md");
  // Read required artifacts before saving any Git snapshot.
  fs.readFileSync(path.join(directory, "README.md"), "utf8");
  const tasks = fs.readFileSync(tasksPath, "utf8");
  if (loadRuntimeState(root).active_change_id === changeId) {
    change = pauseChange(root, changeId, options);
  }
  change.status = "cancelled";
  change.cancellation = record;
  change.next_action = "已取消；保留历史资料，发布或回滚待办仍以 release.md 为准";
  change.resume = change.resume || {};
  change.resume.context_summary = `需求在 ${change.phase} 阶段取消。原因和确认人见 cancellation；历史方案、任务和发布事实保留在正式文件中。`;
  let statusColumn = -1;
  const updatedTasks = tasks.split("\n").map((line) => {
    if (!line.trim().startsWith("|")) {
      statusColumn = -1;
      return line;
    }
    const columns = line.split("|");
    const header = columns.findIndex((column) => column.trim() === "状态");
    if (header >= 0) statusColumn = header;
    if (statusColumn >= 0 && ["todo", "doing", "blocked"].includes(columns[statusColumn]?.trim())) {
      columns[statusColumn] = " cancelled ";
      return columns.join("|");
    }
    return line;
  }).join("\n");
  const note = `- 原阶段：${change.phase}\n- 取消时间：${record.at}\n- 确认人：${record.reviewer}\n- 原因：${record.reason}\n- 未完成任务已终止，不代表验证或发布通过；发布处置仍以 release.md 为准。`;
  fs.writeFileSync(tasksPath, updatedTasks, "utf8");
  appendDocumentSection(tasksPath, "## 需求取消记录", note);
  appendDocumentSection(path.join(directory, "README.md"), "## 需求取消记录", note);
  saveChange(root, change);
  clearActiveChange(root, changeId);
  return options.archive ? archiveChange(root, changeId, options) : change;
}

function archiveChange(root, changeId, options = {}) {
  const record = terminationRecord(options);
  const change = loadChange(root, changeId);
  if (change.status !== "cancelled" && !(change.phase === "closed" && change.status === "done")) {
    throw new DevixError("CHANGE_NOT_TERMINATED", "归档前必须取消需求或正常完成关闭");
  }
  if (!change.archive) {
    change.archive = record;
    saveChange(root, change);
  }
  clearActiveChange(root, changeId);
  return change;
}

function listChanges(root, options = {}) {
  const directory = path.join(root, loadConfig(root).workspace.changes_dir);
  const changes = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, "change.yaml")))
    .map((entry) => loadChange(root, entry.name))
    .filter((change) => options.includeArchived || !change.archive)
    .map((change) => ({
      change_id: change.id, title: change.title, phase: change.phase, status: change.status,
      cancellation: change.cancellation || null, archive: change.archive || null,
    }))
    .sort((a, b) => a.change_id.localeCompare(b.change_id));
  return { active_change_id: loadRuntimeState(root).active_change_id, changes };
}

function changeStatus(root, changeId = null) {
  const runtime = loadRuntimeState(root);
  const id = changeId || runtime.active_change_id;
  if (!id) {
    return { active_change_id: null };
  }
  const change = loadChange(root, id);
  const repositories = (change.repositories || []).map((repository) => {
    if (isTerminal(change)) {
      return {
        id: repository.id, expected_branch: repository.feature_branch,
        last_known_head: repository.last_known_head, snapshot: repository.snapshot,
        state_source: "saved",
      };
    }
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
    gates: change.gates || {},
    blockers: change.blockers || [],
    revision_state: change.revision_state || null,
    cancellation: change.cancellation || null,
    archive: change.archive || null,
    repositories,
  };
}

module.exports = {
  PHASES,
  RELEASE_ENVIRONMENTS,
  RELEASE_IMPACTS,
  RELEASE_STATUSES,
  STATUSES,
  activateChange,
  addRepositories,
  advanceChange,
  archiveChange,
  buildContext,
  changeStatus,
  cancelChange,
  createAndActivateChange,
  intakeChange,
  listChanges,
  newManifest,
  pauseChange,
  preflightActivate,
  preflightPause,
  switchChange,
  reviseChange,
  validateChange,
};
