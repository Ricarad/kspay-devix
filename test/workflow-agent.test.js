const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { intakeChange, reviseChange, validateChange } = require("../src/change-service");
const { loadChange, saveChange } = require("../src/files");
const { initializeWorkspace } = require("../src/workspace-service");
const { installAgents } = require("../src/agent-service");

function workspace() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "devix-workflow-"));
  const root = path.join(parent, "workspace");
  initializeWorkspace(root);
  return root;
}

test("intake creates decisions and preserves source/description", () => {
  const root = workspace();
  const result = intakeChange(root, {
    changeId: "batch-query",
    title: "Batch Query",
    source: "https://docs.example.test/req",
    description: "Support batch query for the endpoint.",
  });
  const directory = path.join(root, "changes", "batch-query");
  assert.equal(result.phase, "clarification");
  assert.equal(fs.existsSync(path.join(directory, "decisions.md")), true);
  assert.match(fs.readFileSync(path.join(directory, "README.md"), "utf8"), /Support batch query/);
  assert.deepEqual(loadChange(root, "batch-query").sources, ["https://docs.example.test/req"]);
  assert.equal(validateChange(root, "batch-query", { strict: true }).valid, true);
});

test("delta revision blocks implementation until explicit confirmation", () => {
  const root = workspace();
  intakeChange(root, { changeId: "revision", title: "Revision", description: "Initial" });
  const implementation = loadChange(root, "revision");
  implementation.phase = "implementation";
  implementation.resume.knowledge_status = "not_found";
  saveChange(root, implementation);
  const pending = reviseChange(root, "revision", "delta", "Add a response field");
  assert.equal(pending.status, "blocked");
  assert.equal(pending.revision.status, "pending_confirmation");
  assert.equal(validateChange(root, "revision", { strict: true }).valid, false);
  const confirmed = reviseChange(root, "revision", "delta", "Add a response field", {
    confirm: true,
    reviewer: "product-owner",
    evidence: "approved in task",
  });
  assert.equal(confirmed.status, "active");
  assert.equal(confirmed.gates.design_review.status, "passed");
  assert.equal(loadChange(root, "revision").revisions.length, 1);
});

test("agent install is idempotent and writes both client adapters", () => {
  const root = workspace();
  const home = path.join(root, "home");
  const result = installAgents({ target: "all", home, source: path.resolve(__dirname, ".."), executeClient: false });
  assert.equal(result.installed.length, 2);
  assert.equal(result.installed.every((entry) => entry.registration === "deferred"), true);
  assert.equal(fs.existsSync(path.join(home, "plugins", "kspay-devix-codex", ".codex-plugin", "plugin.json")), true);
  assert.equal(fs.existsSync(path.join(home, ".devix", "plugins", "kspay-devix-myflicker", "plugin.js")), true);
  const myflickerManifest = JSON.parse(fs.readFileSync(path.join(home, ".devix", "plugins", "kspay-devix-myflicker", ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(myflickerManifest.main, "plugin.js");
  assert.equal(fs.existsSync(path.join(home, ".devix", "plugins", "kspay-devix-myflicker", ".claude-plugin", "marketplace.json")), true);
  const marketplace = JSON.parse(fs.readFileSync(result.installed[0].marketplace, "utf8"));
  assert.equal(marketplace.plugins[0].name, "kspay-devix-codex");
  const second = installAgents({ target: "codex", home, source: path.resolve(__dirname, ".."), executeClient: false });
  assert.equal(second.installed.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(result.installed[0].marketplace, "utf8")).plugins.length, 1);
});
