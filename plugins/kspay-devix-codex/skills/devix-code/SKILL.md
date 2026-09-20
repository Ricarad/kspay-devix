---
name: devix-code
description: Implement the approved active Devix change and handle natural-language incremental changes.
---

Run only after the design review gate passes. Read README.md, the authoritative `design.md`, tasks.md, decisions.md, release.md, repository AGENTS.md files, and current code facts before editing declared repositories. Treat `design-review.md` as a derived review view; when a Delta or Major change affects reviewable facts, update it together with the authoritative design before continuing.

After every implementation batch, update the `tasks.md` section `代码产物清单`. Record every added, modified, deleted, or generated-test file and the concrete class/interface/enum (or equivalent language construct) affected. Include the repository, exact file path, behavior changed, intended unit-test target, and current unit-test status. A file-only summary is incomplete. Include generated test classes in the same ledger with `generated-test`.

For frontend code only, tests may be generated and run temporarily during development or verification. Delete them after use or ensure they are excluded from the submitted content; frontend delivery must not retain or submit temporary test files. Record their execution evidence in `verification.md`. Backend code continues to follow the ledger and test artifact rules above.

For ordinary user changes, classify them before coding:

- Local: internal implementation-only change. Stay in implementation, update code/tests and tasks.md.
- Delta: behavior, interface, acceptance, data, or release impact. Call `devix change revise` with mode delta, update only affected documents, add an open decision, update release.md, and wait for explicit confirmation before continuing.
- Major: core goal, architecture, repository, or topology change. Call `devix change revise` with mode major, preserve history and stale evidence, and return to clarification/design.

Never silently change requirements or design. Update release.md immediately when code reveals a Kconf, AB, task, RPC, topic, Redis, table, template, or environment-specific release action.
