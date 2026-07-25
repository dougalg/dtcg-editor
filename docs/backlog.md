# Backlog

Planned features not yet in progress. Pick one and run `/sdd-feature` to start it.
Completed items are moved to `docs/backlog-completed.md` by `/sdd-archive`, not marked `[x]` here.

- [ ] CI-level Conventional Commit enforcement — lint actual commit messages/PR commit range in CI (not just the commitlint config's own unit tests); local husky `commit-msg` hook remains the only enforcement today. Deferred from the Bootstrap CI feature.
- [ ] Inject dependencies by default (e.g. `fs.readFile`, etc.) — establish a convention for passing I/O/platform calls in as explicit parameters rather than importing and calling them directly, for testability and consistency; interacts with the Result-pattern refactor's Logger-injection approach.
- [ ] Migrate `apps/web-app/lib/config.ts`'s `ConfigError`/`loadConfig` to the Result pattern — separate call path (startup config loading via `instrumentation.ts`), out of scope for the token-read-chain Result-pattern migration but the same constraint applies.
- [ ] Define UI-layer `Result` consumption conventions (React hooks, error boundaries) once real client-side component code exists — `docs/project.md`'s Error Handling constraint explicitly defers this; also covers giving `FileNotFoundError` its own distinct message in `page.tsx` instead of the generic fallback.
