---
name: devix-status
description: Show active Devix change, phase, gates, blockers, repositories, and next action.
---

Run `devix change status` and `devix change validate --strict` from the current workspace. Present the active change, phase, status, next action, gate states, blockers, pending decisions, revision state, repository branch/dirty state, and release readiness. Do not mutate files.

For historical, cancelled or archived changes, locate the target with `devix change list --include-archived` and pass its id explicitly to status/validate. Include cancellation reason/reviewer/time and archive state. Terminal repository information comes from saved snapshots, not a live checkout; do not present it as current branch/dirty state. A cancelled requirement's unfinished gates describe historical work, not permission to resume it.
