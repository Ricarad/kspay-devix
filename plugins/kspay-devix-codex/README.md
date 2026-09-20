# Devix Codex Plugin

The plugin exposes the six Devix workflow commands as direct slash entries. Each skill reads the active change before acting and keeps `release.md` and `decisions.md` synchronized with the current phase. New changes produce an authoritative `design.md` and a derived `design-review.md`; implementation and testing continue to use `design.md` as the source of truth.

For installation, workspace layout, command phases, and artifact meanings, see the [Devix plugin sharing guide](../../docs/plugin-guide.md).
