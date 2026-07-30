# Backlog

Planned features not yet in progress. Pick one and run `/sdd-feature` to start it.
Completed items are moved to `docs/backlog-completed.md` by `/sdd-archive`, not marked `[x]` here.

- [ ] Generic fallback token editor: provide a default/fallback interactive editor for token kinds that have no registered editor (currently read-only only) — should also be used to more thoroughly test the config-driven editor-extension mechanism's genericity (e.g. via a second, non-default editor), a test depth intentionally deferred from the DimensionEditor config-enablement feature.
- [ ] Support for colour tokens
- [ ] Improve UI/UX
- [ ] Accessibility testing (in progress — worktree `.claude/worktrees/accessibility-testing`, branch `worktree-accessibility-testing`)
- [ ] Upgrade `typescript` to v7 — blocked as of 2026-07-27: breaks `apps/web-app`'s build outright since Next.js 16.2.12 doesn't yet support TypeScript 7's new native compiler API ("TypeScript 7.0.2 does not provide the compiler API required by Next.js"); `@typescript-eslint@8.65.0` also only declares peer support up to `typescript<6.1.0`, so lint would likely break too. Verify Next.js and `@typescript-eslint` both support TypeScript 7 before attempting again.
- [ ] Add a regression guard for the `apps/web-app/instrumentation.ts` Edge Runtime `process.exit` fix — deferred as of 2026-07-28, not urgent since the fix itself resolves the current warning. If it recurs (e.g. a future change reintroduces an un-isolated `process.exit` or other Node-only API directly in `instrumentation.ts`), add either an ESLint `no-restricted-syntax` rule scoped to that file banning direct `process.exit` calls, or a CI step that greps `next build`'s output for Edge Runtime warnings and fails the build — both discussed but not implemented when the underlying fix shipped.
