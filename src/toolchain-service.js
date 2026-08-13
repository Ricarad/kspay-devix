const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("./git");
const { DevixError } = require("./errors");

const DEFAULT_TOOL_HOME = path.join(os.homedir(), ".devix");
const DEFAULT_LAUNCHER_PATH = path.join(os.homedir(), ".local", "bin", "devix");
const PACKAGE_ENTRY = path.join("node_modules", "kspay-devix", "bin", "devix.js");

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function findNpmCli(nodePath = process.execPath) {
  const nodeBin = path.dirname(nodePath);
  const candidates = [
    path.join(nodeBin, "npm"),
    path.resolve(nodeBin, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new DevixError("NPM_NOT_FOUND", `无法定位与当前 Node.js 配套的 npm：${nodePath}`);
}

function readPackageVersion(packageRoot) {
  const packageFile = path.join(packageRoot, "package.json");
  if (!fs.existsSync(packageFile)) {
    throw new DevixError("UPDATE_SOURCE_INVALID", "更新源缺少 package.json");
  }
  try {
    const value = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    if (value.name !== "kspay-devix" || !/^[0-9A-Za-z][0-9A-Za-z._+-]*$/.test(value.version || "")) {
      throw new Error("包名或版本无效");
    }
    return value.version;
  } catch (error) {
    throw new DevixError("UPDATE_SOURCE_INVALID", `更新源 package.json 无效：${error.message}`);
  }
}

function validateInstalledToolchain(directory, expectedVersion) {
  const entry = path.join(directory, PACKAGE_ENTRY);
  const packageFile = path.join(directory, "node_modules", "kspay-devix", "package.json");
  if (!fs.existsSync(entry) || !fs.existsSync(packageFile)) return null;
  const installed = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  if (installed.version !== expectedVersion) return null;
  return entry;
}

function prepareToolchain(sourceRoot, sourceCommit, options = {}) {
  const toolHome = path.resolve(options.toolHome || process.env.DEVIX_TOOL_HOME || DEFAULT_TOOL_HOME);
  const launcherPath = path.resolve(options.launcherPath || process.env.DEVIX_LAUNCHER_PATH || DEFAULT_LAUNCHER_PATH);
  if (toolHome === path.parse(toolHome).root) {
    throw new DevixError("CLI_HOME_INVALID", `CLI 缓存目录不能是文件系统根目录：${toolHome}`);
  }
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new DevixError("UPDATE_SOURCE_INVALID", `更新源提交号无效：${sourceCommit}`);
  }
  const version = readPackageVersion(sourceRoot);
  const versionId = `${version}-${sourceCommit.slice(0, 12)}`;
  const versionsRoot = path.join(toolHome, "versions");
  const versionRoot = path.join(versionsRoot, versionId);
  let entry = validateInstalledToolchain(versionRoot, version);
  let installed = false;

  if (!entry) {
    const staging = `${versionRoot}.staging-${process.pid}`;
    fs.mkdirSync(versionsRoot, { recursive: true });
    fs.rmSync(staging, { recursive: true, force: true });
    try {
      const npmCli = findNpmCli(options.nodePath || process.execPath);
      run(options.nodePath || process.execPath, [
        npmCli,
        "install",
        "--prefix",
        staging,
        "--omit=dev",
        "--ignore-scripts",
        "--install-links=true",
        "--no-audit",
        "--no-fund",
        sourceRoot,
      ]);
      entry = validateInstalledToolchain(staging, version);
      if (!entry) {
        throw new DevixError("CLI_INSTALL_INVALID", `CLI 缓存安装结果无效：${staging}`);
      }
      fs.rmSync(versionRoot, { recursive: true, force: true });
      fs.renameSync(staging, versionRoot);
      entry = path.join(versionRoot, PACKAGE_ENTRY);
      installed = true;
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }

  return {
    toolHome,
    launcherPath,
    version,
    versionId,
    versionRoot,
    entry,
    installed,
    nodePath: options.nodePath || process.execPath,
  };
}

function replaceSymlink(target, linkPath) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  const temporary = `${linkPath}.devix-update-${process.pid}`;
  fs.rmSync(temporary, { force: true, recursive: true });
  fs.symlinkSync(target, temporary, "dir");
  fs.renameSync(temporary, linkPath);
}

function writeLauncher(launcherPath, nodePath, currentEntry) {
  fs.mkdirSync(path.dirname(launcherPath), { recursive: true });
  const temporary = `${launcherPath}.devix-update-${process.pid}`;
  const content = [
    "#!/bin/sh",
    "# Managed by devix update. Do not edit.",
    `exec ${shellQuote(nodePath)} ${shellQuote(currentEntry)} "$@"`,
    "",
  ].join("\n");
  try {
    fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o755 });
    fs.chmodSync(temporary, 0o755);
    fs.renameSync(temporary, launcherPath);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function activateToolchain(prepared) {
  const current = path.join(prepared.toolHome, "current");
  const previous = fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()
    ? fs.readlinkSync(current)
    : null;
  if (fs.existsSync(current) && !fs.lstatSync(current).isSymbolicLink()) {
    throw new DevixError("CLI_CURRENT_INVALID", `CLI current 不是符号链接：${current}`);
  }

  try {
    replaceSymlink(prepared.versionRoot, current);
    writeLauncher(
      prepared.launcherPath,
      prepared.nodePath,
      path.join(current, PACKAGE_ENTRY),
    );
  } catch (error) {
    if (previous) replaceSymlink(previous, current);
    else fs.rmSync(current, { force: true });
    throw error;
  }

  const launcherOnPath = resolvePathCommand("devix") === prepared.launcherPath;

  return {
    version: prepared.version,
    version_id: prepared.versionId,
    source_installed: prepared.installed,
    tool_home: prepared.toolHome,
    launcher_path: prepared.launcherPath,
    launcher_on_path: launcherOnPath,
    warnings: launcherOnPath
      ? []
      : [`稳定启动器未处于 PATH 首选位置，请将 ${path.dirname(prepared.launcherPath)} 放到 PATH 前部`],
    current_entry: path.join(current, PACKAGE_ENTRY),
  };
}

function resolvePathCommand(command, envPath = process.env.PATH || "") {
  for (const directory of envPath.split(path.delimiter).filter(Boolean)) {
    const candidate = path.resolve(directory, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Continue searching PATH.
    }
  }
  return null;
}

module.exports = {
  DEFAULT_LAUNCHER_PATH,
  DEFAULT_TOOL_HOME,
  PACKAGE_ENTRY,
  activateToolchain,
  findNpmCli,
  prepareToolchain,
};
