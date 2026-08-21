const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { DevixError } = require("./errors");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const CLIENTS = ["codex", "myflicker"];

function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" }).status === 0;
}

function rejectCredentialUrl(source) {
  const authority = String(source).match(/^[a-z]+:\/\/([^/]+)/i)?.[1] || "";
  if (authority.includes("@") || /^[a-z]+:\/\/[^/\s:@]+:[^/\s@]+@/i.test(source)) {
    throw new DevixError("SOURCE_CREDENTIALS_FORBIDDEN", "插件 source URL 不得包含用户名、密码或 token");
  }
}

function copyPlugin(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function runMyflicker(args, details = {}) {
  const result = spawnSync("myflicker", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new DevixError("MYFLICKER_PLUGIN_INSTALL_FAILED", `MyFlicker 命令失败：myflicker ${args.join(" ")}`, {
      ...details,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
  return result.stdout;
}

function myflickerMarketplaceState() {
  try {
    return JSON.parse(runMyflicker(["plugin", "marketplace", "list", "--json"]));
  } catch (error) {
    if (error instanceof DevixError) throw error;
    return [];
  }
}

function myflickerPluginState() {
  try {
    return JSON.parse(runMyflicker(["plugin", "list", "--json"]));
  } catch (error) {
    if (error instanceof DevixError) throw error;
    return { installed: [] };
  }
}

function installMyflickerPlugin(source, home, options = {}) {
  const persistentSource = path.join(home, ".devix", "plugins", "kspay-devix-myflicker");
  copyPlugin(source, persistentSource);
  if (options.executeClient === false) {
    return { path: persistentSource, marketplace: "kspay-devix", plugin: "kspay-devix-myflicker", registration: "deferred" };
  }
  if (!commandExists("myflicker")) {
    throw new DevixError("AGENT_CLIENT_NOT_FOUND", "未找到 myflicker，无法注册 MyFlicker 插件");
  }
  const marketplaces = myflickerMarketplaceState();
  const known = marketplaces.find((marketplace) => marketplace.name === "kspay-devix");
  if (known) runMyflicker(["plugin", "marketplace", "update", "kspay-devix"]);
  else runMyflicker(["plugin", "marketplace", "add", persistentSource, "--scope", "user"]);

  const installed = myflickerPluginState().installed || [];
  const pluginRef = "kspay-devix-myflicker@kspay-devix";
  if (installed.some((plugin) => plugin.name === "kspay-devix-myflicker" && plugin.marketplace === "kspay-devix")) {
    runMyflicker(["plugin", "update", pluginRef]);
  } else {
    runMyflicker(["plugin", "install", pluginRef, "--scope", "user"]);
  }
  return { path: persistentSource, marketplace: "kspay-devix", plugin: "kspay-devix-myflicker", registration: "installed" };
}

function updateCodexMarketplace(home, pluginPath) {
  const marketplacePath = path.join(home, ".agents", "plugins", "marketplace.json");
  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
  let marketplace = { name: "personal", interface: { displayName: "Personal" }, plugins: [] };
  if (fs.existsSync(marketplacePath)) marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  marketplace.plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  marketplace.plugins = marketplace.plugins.filter((entry) => entry.name !== "kspay-devix-codex");
  marketplace.plugins.push({
    name: "kspay-devix-codex",
    source: { source: "local", path: pluginPath },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  });
  fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
  return marketplacePath;
}

function installAgents(options = {}) {
  const targets = options.target ? (Array.isArray(options.target) ? options.target : [options.target]) : CLIENTS.filter((client) => commandExists(client));
  if (targets.some((target) => target !== "all" && !CLIENTS.includes(target))) throw new DevixError("AGENT_TARGET_INVALID", "target 只能是 codex、myflicker 或 all");
  const selected = targets.includes("all") ? CLIENTS : targets;
  if (selected.length === 0) return { installed: [], skipped: CLIENTS, message: "未检测到 Codex 或 MyFlicker 客户端" };
  rejectCredentialUrl(options.source || "");
  const sourceRoot = path.resolve(options.source || PACKAGE_ROOT);
  const codexSource = path.join(sourceRoot, "plugins", "kspay-devix-codex");
  const myflickerSource = path.join(sourceRoot, "plugins", "kspay-devix-myflicker");
  for (const source of [codexSource, myflickerSource]) {
    if (!fs.existsSync(source)) throw new DevixError("PLUGIN_SOURCE_MISSING", `插件源不存在：${source}`);
  }
  const home = options.home || os.homedir();
  const installed = [];
  const skipped = CLIENTS.filter((client) => !selected.includes(client));
  if (selected.includes("codex")) {
    const target = path.join(home, "plugins", "kspay-devix-codex");
    copyPlugin(codexSource, target);
    const marketplace = updateCodexMarketplace(home, "./plugins/kspay-devix-codex");
    installed.push({ client: "codex", path: target, marketplace });
  }
  if (selected.includes("myflicker")) {
    installed.push({ client: "myflicker", ...installMyflickerPlugin(myflickerSource, home, options) });
  }
  return { installed, skipped, source: sourceRoot, ref: options.ref || "working-tree" };
}

module.exports = { installAgents, commandExists };
