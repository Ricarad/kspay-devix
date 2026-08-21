const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { DevixError } = require("./errors");

const CURRENT_CHANGE_SCHEMA_VERSION = 2;
const LEGACY_CORE_CHANGE_FILES = [
  "change.yaml",
  "README.md",
  "design.md",
  "tasks.md",
  "verification.md",
];
const CORE_CHANGE_FILES = [
  "change.yaml",
  "README.md",
  "design.md",
  "tasks.md",
  "release.md",
  "verification.md",
];

function coreChangeFilesForSchema(schemaVersion) {
  if (schemaVersion === 1) return LEGACY_CORE_CHANGE_FILES;
  if (schemaVersion === CURRENT_CHANGE_SCHEMA_VERSION) return CORE_CHANGE_FILES;
  throw new DevixError("CHANGE_SCHEMA_UNSUPPORTED", `不支持的 change schema_version：${schemaVersion}`);
}

function findWorkspace(startPath = process.cwd()) {
  let current = path.resolve(startPath);
  while (true) {
    if (fs.existsSync(path.join(current, "devix.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new DevixError("WORKSPACE_NOT_FOUND", `未找到 devix.yaml：${startPath}`);
    }
    current = parent;
  }
}

function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new DevixError("FILE_NOT_FOUND", `文件不存在：${filePath}`);
  }
  try {
    return YAML.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new DevixError("YAML_INVALID", `YAML 解析失败：${filePath}`, {
      cause: error.message,
    });
  }
}

function writeYaml(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, YAML.stringify(value, { lineWidth: 0 }), "utf8");
  fs.renameSync(temporary, filePath);
}

function loadConfig(root) {
  return loadYaml(path.join(root, "devix.yaml"));
}

function changeDirectory(root, changeId, config = loadConfig(root)) {
  return path.join(root, config.workspace.changes_dir, changeId);
}

function changeFile(root, changeId, config = loadConfig(root)) {
  return path.join(changeDirectory(root, changeId, config), "change.yaml");
}

function loadChange(root, changeId, config = loadConfig(root)) {
  return loadYaml(changeFile(root, changeId, config));
}

function saveChange(root, change, config = loadConfig(root)) {
  change.updated_at = new Date().toISOString();
  writeYaml(changeFile(root, change.id, config), change);
}

function runtimeStateFile(root) {
  return path.join(root, ".devix", "runtime", "workspace-state.yaml");
}

function repositoryCatalogFile(root) {
  return path.join(root, "repositories.yaml");
}

function loadRepositoryCatalog(root) {
  const filePath = repositoryCatalogFile(root);
  if (!fs.existsSync(filePath)) {
    return { schema_version: 1, repositories: [] };
  }
  return loadYaml(filePath);
}

function saveRepositoryCatalog(root, catalog) {
  writeYaml(repositoryCatalogFile(root), catalog);
}

function loadRuntimeState(root) {
  const filePath = runtimeStateFile(root);
  if (!fs.existsSync(filePath)) {
    return { schema_version: 1, active_change_id: null };
  }
  return loadYaml(filePath);
}

function saveRuntimeState(root, state) {
  writeYaml(runtimeStateFile(root), state);
}

function renderTemplate(source, replacements) {
  let text = fs.readFileSync(source, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    text = text.split(from).join(to);
  }
  return text;
}

function createChangeFiles(root, changeId, title, manifest, config = loadConfig(root)) {
  const target = changeDirectory(root, changeId, config);
  if (fs.existsSync(target)) {
    throw new DevixError("CHANGE_EXISTS", `change 已存在：${changeId}`);
  }
  fs.mkdirSync(target, { recursive: false });
  const workspaceTemplateDir = path.join(root, ".devix", "templates", "change");
  const packageTemplateDir = path.resolve(__dirname, "..", "templates", "change");
  const templateDir = fs.existsSync(workspaceTemplateDir) ? workspaceTemplateDir : packageTemplateDir;
  const replacements = {
    "replace-with-change-id": changeId,
    "替换为需求名称": title,
    "# 需求名称": `# ${title}`,
  };
  const coreFiles = coreChangeFilesForSchema(manifest.schema_version);
  for (const fileName of coreFiles.filter((name) => name !== "change.yaml")) {
    const source = path.join(templateDir, fileName);
    if (!fs.existsSync(source)) {
      throw new DevixError("TEMPLATE_INVALID", `模板缺少文件：${source}`);
    }
    fs.writeFileSync(
      path.join(target, fileName),
      renderTemplate(source, replacements),
      "utf8",
    );
  }
  const includeDecisions = Boolean(manifest.include_decisions);
  if (includeDecisions) {
    const source = path.join(templateDir, "decisions.md");
    if (!fs.existsSync(source)) {
      throw new DevixError("TEMPLATE_INVALID", `模板缺少文件：${source}`);
    }
    fs.writeFileSync(path.join(target, "decisions.md"), fs.readFileSync(source, "utf8"), "utf8");
  }
  delete manifest.include_decisions;
  writeYaml(path.join(target, "change.yaml"), manifest);
}

module.exports = {
  CURRENT_CHANGE_SCHEMA_VERSION,
  CORE_CHANGE_FILES,
  LEGACY_CORE_CHANGE_FILES,
  changeDirectory,
  changeFile,
  coreChangeFilesForSchema,
  createChangeFiles,
  findWorkspace,
  loadChange,
  loadConfig,
  loadRuntimeState,
  loadRepositoryCatalog,
  loadYaml,
  runtimeStateFile,
  saveChange,
  saveRuntimeState,
  saveRepositoryCatalog,
  writeYaml,
};
