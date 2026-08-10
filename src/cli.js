const {
  addRepositories,
  advanceChange,
  changeStatus,
  createAndActivateChange,
  pauseChange,
  switchChange,
  validateChange,
} = require("./change-service");
const { findWorkspace, loadRuntimeState } = require("./files");
const { DevixError } = require("./errors");
const { initializeWorkspace } = require("./workspace-service");
const { addRepository, listRepositories } = require("./repository-service");

function parseArguments(args) {
  const positional = [];
  const options = { repo: [] };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const name = token.slice(2);
    if (["json", "adopt-current-branch", "no-git", "codegraph-init", "help", "version"].includes(name)) {
      options[name] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new DevixError("ARGUMENT_INVALID", `参数缺少值：${token}`);
    }
    index += 1;
    if (name === "repo") options.repo.push(value);
    else options[name] = value;
  }
  return { positional, options };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return `用法：
  devix init|install <workspace-directory> [--branch main] [--no-git]
  devix repo add <repo-id> --url <git-url> [--base master] [--codegraph-init]
  devix repo list
  devix change new <change-id> --title <标题> [--repo <repo-id[:base-branch]>]
  devix change switch <change-id> [--adopt-current-branch]
  devix change pause [--adopt-current-branch]
  devix change repo-add <change-id> --repo <repo-id[:base-branch]>
  devix change status [change-id]
  devix change validate <change-id>
  devix change advance <change-id> --to <phase>

全局参数：--workspace <kspay-devix目录>`;
}

async function main(argv) {
  const { positional, options } = parseArguments(argv);
  const subject = positional[0];

  if (options.version) {
    process.stdout.write(`${require("../package.json").version}\n`);
    return;
  }
  if (options.help || subject === "help" || !subject) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (subject === "init" || subject === "install") {
    if (!positional[1]) throw new DevixError("USAGE", usage());
    print(initializeWorkspace(positional[1], {
      branch: options.branch || "main",
      initializeGit: !options["no-git"],
    }));
    return;
  }

  const root = findWorkspace(options.workspace || process.cwd());
  if (subject === "repo") {
    const repoCommand = positional[1];
    if (repoCommand === "add") {
      const repoId = positional[2];
      if (!repoId || !options.url) throw new DevixError("USAGE", usage());
      print(addRepository(root, repoId, {
        url: options.url,
        baseBranch: options.base || "master",
        initializeCodeGraph: Boolean(options["codegraph-init"]),
      }));
      return;
    }
    if (repoCommand === "list") {
      print(listRepositories(root));
      return;
    }
    throw new DevixError("USAGE", usage());
  }

  if (subject !== "change") throw new DevixError("USAGE", usage());
  const command = positional[1];
  const changeId = positional[2];
  const switchOptions = { adoptCurrentBranch: Boolean(options["adopt-current-branch"]) };

  switch (command) {
    case "new":
      if (!changeId || !options.title) throw new DevixError("USAGE", usage());
      print(createAndActivateChange(root, changeId, options.title, options.repo, switchOptions));
      break;
    case "switch":
      if (!changeId) throw new DevixError("USAGE", usage());
      print(switchChange(root, changeId, switchOptions));
      break;
    case "pause": {
      const runtime = loadRuntimeState(root);
      if (!runtime.active_change_id) {
        throw new DevixError("NO_ACTIVE_CHANGE", "当前没有激活的 change");
      }
      print(pauseChange(root, runtime.active_change_id, switchOptions));
      break;
    }
    case "repo-add":
      if (!changeId || options.repo.length === 0) throw new DevixError("USAGE", usage());
      print(addRepositories(root, changeId, options.repo, switchOptions));
      break;
    case "status":
      print(changeStatus(root, changeId));
      break;
    case "validate": {
      if (!changeId) throw new DevixError("USAGE", usage());
      const result = validateChange(root, changeId);
      print(result);
      if (!result.valid) process.exitCode = 1;
      break;
    }
    case "advance":
      if (!changeId || !options.to) throw new DevixError("USAGE", usage());
      print(advanceChange(root, changeId, options.to));
      break;
    default:
      throw new DevixError("USAGE", usage());
  }
}

module.exports = { main, parseArguments };
