---
name: devix-design
description: Produce the verified technical design and implementation plan for the active Devix change.
---

Run only for an active change in the design phase after clarification and knowledge gates pass.

Read README.md, decisions.md, release.md, knowledge sources, repositories.yaml, every applicable repository AGENTS.md, and current code facts. If a repository has `.codegraph/`, sync it before analysis. Write design.md, tasks.md, and the affected release.md sections. Record only explicitly confirmed choices in decisions.md. Do not modify business code. Stop on blocked gates or unresolved decisions that change the design. Validate with `devix change validate --strict` and require an explicit design review before moving to code.
