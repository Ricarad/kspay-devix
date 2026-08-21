---
name: devix-close
description: Close a fully verified Devix change after release and decision cleanup.
---

Read all formal change files and run `devix change validate --strict`. Confirm verification evidence, release SOP execution or an explicit no-impact waiver, and that every open decision is resolved, formally deferred, or explicitly waived. Confirm monitoring and delayed cleanup are complete. Do not self-approve human gates. Advance one phase to closed only after the verification gate and release completion conditions are satisfied, then write a concise resume summary and reusable knowledge only when it is independent of this change.
