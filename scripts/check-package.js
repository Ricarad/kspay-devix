const { spawnSync } = require("node:child_process");

const forbiddenPrefixes = [
  "changes/",
  "test/",
  "scripts/",
  "repos/",
  ".devix/",
  ".worktrees/",
];
const forbiddenFiles = new Set([
  "package-lock.json",
  "docs/repository-management.md",
  "docs/workflow.md",
]);

const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "npm pack --dry-run failed\n");
  process.exit(result.status || 1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  process.stderr.write(`PACKAGE_REPORT_INVALID: ${error.message}\n`);
  process.exit(1);
}

const files = report[0]?.files?.map((entry) => entry.path) || [];
const leaked = files.filter(
  (file) =>
    forbiddenFiles.has(file) ||
    forbiddenPrefixes.some((prefix) => file.startsWith(prefix)),
);

if (leaked.length > 0) {
  process.stderr.write(`PACKAGE_CONTAINS_DEVELOPMENT_FILES ${leaked.join(",")}\n`);
  process.exit(1);
}

for (const required of ["bin/devix.js", "src/cli.js", "templates/workspace/README.md"]) {
  if (!files.includes(required)) {
    process.stderr.write(`PACKAGE_MISSING_RUNTIME_FILE ${required}\n`);
    process.exit(1);
  }
}

process.stdout.write(`PACKAGE_OK files=${files.length}\n`);
