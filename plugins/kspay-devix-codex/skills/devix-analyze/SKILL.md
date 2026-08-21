---
name: devix-analyze
description: Start or resume Devix requirements clarification for the current workspace.
---

Use this command as the requirements clarification entry point.

1. Locate the Devix workspace and read its root AGENTS.md and runtime workspace state.
2. If the user supplied a new requirement, attachment, or Docs link, call `devix change intake` with an AI-generated kebab-case change id and concise title. Preserve the original source and description.
3. Read the active change files and write only clarification artifacts: README.md, decisions.md, release.md, and change.yaml. Do not inspect real business code or write design.md, tasks.md, verification.md, or business code.
4. Keep decisions.md sections exactly `Open Decisions`, `Confirmed Decisions`, and `Assumptions`. Never move an item to Confirmed without explicit user or owner confirmation.
5. Set the clarification gate only from an explicit reviewer confirmation. Run `devix change validate --strict` before proposing the next stage.

When a user requests a change while another change is active, preserve and pause the existing change through the intake API before activating the new one.
