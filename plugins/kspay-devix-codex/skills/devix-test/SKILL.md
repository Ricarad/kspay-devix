---
name: devix-test
description: Execute and record verification for the active Devix change.
---

Run only after implementation is complete and release readiness is explicitly passed or waived. Read README.md acceptance criteria, the authoritative `design.md` test design, the class-level `代码产物清单` in tasks.md, decisions.md, release.md, and repository testing rules. Use `design-review.md` only as a review summary, never as the implementation or test fact source.

The primary job of this command is unit-test generation and verification. For every `added` or `modified` testable production class, generate or update the repository's existing unit-test style, then register the test class as `generated-test` in the same ledger. Reuse existing tests when they already cover the changed behavior instead of creating duplicates. For deleted, configuration-only, DTO-only, or otherwise non-testable artifacts, record `not_applicable` with a concrete reason. Then execute the generated and affected unit tests. Integration, regression, and non-functional checks remain part of verification when the design requires them, but they must not be silently substituted for missing unit tests.

For frontend code only, a test file may be generated and run temporarily to verify new logic. Delete it after verification or ensure it is excluded from submitted content; do not leave or submit temporary frontend test files by default. Record the command and result in `verification.md`. Backend code retains the generation, ledger, retention, and submission requirements above.

Write actual commands, directories, environments, dates, results, evidence, not-run items, and uncovered risks to verification.md. Never call an unexecuted test passed. Update release.md with real verification and post-release evidence, then request an explicit verification gate.
