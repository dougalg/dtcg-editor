# Backlog

Planned features not yet in progress. Pick one and run `/sdd-feature` to start it.

- [ ] Refactor to use the Result-pattern error/logging standards (`docs/project.md`'s Error Handling constraint) — migrate `token-core`'s `parseTokenFile`/`parseNode` and the `web-app` consumers (`read.ts`, `scan.ts`, `path-safety.ts`, the API route, and `page.tsx`) off thrown errors onto `neverthrow` `Result`s, and stand up the new `@dtcg-editor/errors` package (`UnknownError`, injected `Logger`).
- [ ] Enforce conventional commits (in progress — local git hook + CLI; see `feature.md`)
- [ ] Bootstrap CI (GitHub Actions) — including CI-level conventional commit enforcement once CI exists, plus build/lint/test checks on PRs
