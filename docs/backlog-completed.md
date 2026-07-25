# Completed Backlog Items

Backlog items closed out by `/sdd-archive` once their feature has merged. Moved here (out of `docs/backlog.md`) so the active backlog only shows what's still open.

- [x] Enforce conventional commits — done, see `docs/specs-archive/202607251245-enforce-conventional-commits/`
- [x] Refactor to use the Result-pattern error/logging standards — migrated `token-core`'s `parseTokenFile`/`parseNode` and the `web-app` consumers off thrown errors onto `neverthrow` `Result`s, and stood up `@dtcg-editor/errors` (`UnknownError`, injected `Logger`) — done, see `docs/specs-archive/202607251455-migrate-to-result-pattern-error-handling/`
