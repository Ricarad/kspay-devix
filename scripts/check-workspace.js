const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const YAML = require("yaml");
const { CORE_CHANGE_FILES } = require("../src/files");
const { validateChange } = require("../src/change-service");

const root = path.resolve(__dirname, "..");
const errors = [];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "repos", ".worktrees", ".devix"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else files.push(target);
  }
  return files;
}

const files = walk(root);
for (const file of files.filter((name) => /\.ya?ml$/.test(name))) {
  try {
    YAML.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`YAML_INVALID ${path.relative(root, file)}: ${error.message}`);
  }
}

const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of files.filter((name) => name.endsWith(".md"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].split("#", 1)[0];
    if (!target || /^(https?:\/\/|#)/.test(target) || target.includes("<change-id>")) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
      errors.push(`LINK_MISSING ${path.relative(root, file)} -> ${target}`);
    }
  }
}

const templateFiles = fs.readdirSync(path.join(root, "templates", "change")).sort();
const expectedTemplateFiles = [...CORE_CHANGE_FILES].sort();
if (JSON.stringify(templateFiles) !== JSON.stringify(expectedTemplateFiles)) {
  errors.push(`TEMPLATE_FILES expected=${expectedTemplateFiles.join(",")} actual=${templateFiles.join(",")}`);
}

const changesDir = path.join(root, "changes");
for (const entry of fs.readdirSync(changesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const result = validateChange(root, entry.name);
  errors.push(...result.errors.map((error) => `CHANGE_INVALID ${entry.name}: ${error}`));
}

for (const ignoredPath of ["repos/example", ".worktrees/example/repo", ".devix/runtime/workspace-state.yaml", "node_modules/example"]) {
  const result = spawnSync("git", ["check-ignore", "-q", ignoredPath], { cwd: root });
  if (result.status !== 0) errors.push(`NOT_IGNORED ${ignoredPath}`);
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`WORKSPACE_OK yaml=${files.filter((name) => /\.ya?ml$/.test(name)).length} markdown=${files.filter((name) => name.endsWith(".md")).length} changes=${fs.readdirSync(changesDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length}\n`);
