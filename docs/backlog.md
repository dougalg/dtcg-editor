# Backlog

Planned features not yet in progress. Pick one and run `/sdd-feature` to start it.
Completed items are moved to `docs/backlog-completed.md` by `/sdd-archive`, not marked `[x]` here.

- [ ] Refactor token-type subpackages: move all parsing and type definitions (e.g. `token-type-color/src/color.ts`, `conversion.ts`, `css-color.ts`, `token-type.ts`; `token-type-dimension/src/dimension.ts`, `token-type.ts`) into `token-core`, so the `token-type-*` subpackages (`token-type-color`, `token-type-dimension`, `token-type-contract`, …) hold only editor UI (`editor.tsx` and related styles), with `token-core` as the single source of truth for parsing/type definitions. (in progress — worktree `.claude/worktrees/token-core-refactor`, branch `worktree-token-core-refactor`)
- [ ] Add sugarcube and refactor existing UI to use new their tokens and components
- [ ] Improve UI by adding visible rows, header delineation, and drag and drop reordering of token rows and resolved name visibility OR sticky headers?
- [ ] Add support for additional "non-standard" behaviours, like custom fields
- [ ] Add support for "fontFamily" tokens
- [ ] Add support for "fontWeight" tokens
- [ ] Add support for "duration" tokens
- [ ] Add support for "cubicBezier" tokens
- [ ] Add support for "number" tokens
- [ ] Add support for "strokeStyle" tokens
- [ ] Add support for "border" tokens
- [ ] Add support for "transition" tokens
- [ ] Add support for "shadow" tokens
- [ ] Add support for "gradient" tokens
- [ ] Add support for "typography" tokens
- [ ] Allow the user/configurer to specify in config additional non-standard token types to support. They must also register an editor for it, or the config is invalid. This should be enforced via build-time script checks and TS checks for fast feedback.
- [ ] Migrate ESLint + Prettier to Biome — prerequisite for the TypeScript v7 upgrade below; Biome's own type-inference engine never touches `tsc`'s Compiler API, which removes `typescript-eslint`'s `typescript<6.1.0` peer-range blocker without needing a compatibility shim. Syntax-only lint scope (no type-aware rules adopted), 1:1 parity required for the repo's DI-enforcement rules (`no-restricted-syntax`/`no-restricted-imports`/`no-restricted-globals`), and `eslint-config-next`'s Next.js-specific rules are permanently dropped since Biome has no plugin ecosystem to replace them (confirmed no third-party package fills the gap either). See `feature.md` on this worktree's branch. (in progress — worktree `.claude/worktrees/typescript-v7-research`, branch `worktree-typescript-v7-research`)
- [ ] Upgrade `typescript` to v7 — sequenced to start after the Biome migration above lands, which resolves the `typescript-eslint` blocker. The Next.js side is separately resolved: `experimental.useTypeScriptCli` (16.2.12+) makes `next build` shell out to `tsc` instead of needing the missing Compiler API; decided to accept this flag in production despite Next's own "not recommended for production" caveat, since it's the only path that unblocks the build today. Scope is repo-wide, not just `apps/web-app`. See `docs/research/typescript-v7-upgrade-path.md`. Not yet started.
- [ ] Add a regression guard for the `apps/web-app/instrumentation.ts` Edge Runtime `process.exit` fix — deferred as of 2026-07-28, not urgent since the fix itself resolves the current warning. If it recurs (e.g. a future change reintroduces an un-isolated `process.exit` or other Node-only API directly in `instrumentation.ts`), add either an ESLint `no-restricted-syntax` rule scoped to that file banning direct `process.exit` calls, or a CI step that greps `next build`'s output for Edge Runtime warnings and fails the build — both discussed but not implemented when the underlying fix shipped.
