# Code Review: Generic Fallback Token Editor

## Summary

Clean, well-tested implementation that does exactly what `feature.md`/`plan.md` describe: a single spec-sourced type registry in `token-core`, a generalized `{ type, editor }` extension shape with runtime-validated config, a non-standard-type badge, a generic JSON-text fallback editor, and matching client/server `canEdit`/authorization generalizations. `pnpm build`, `pnpm lint`, `pnpm format:check`, and `pnpm test` (134 web-app + 31 token-core tests) all pass locally. All 9 acceptance criteria are covered by tests that actually exercise the described behavior, and the NFR about deriving "type with no built-in" fixtures dynamically (rather than hardcoding `"fontWeight"`) is honored everywhere it's used. The one finding (a dead re-export the plan explicitly called out for removal) has been fixed and re-verified. Ready to merge.

## Findings

### 🔴 Critical

| Done | Location | Category | Problem | Suggestion |
| ---- | -------- | -------- | ------- | ---------- |

(none)

### 🟠 Major

| Done | Location | Category | Problem | Suggestion |
| ---- | -------- | -------- | ------- | ---------- |

(none)

### 🟡 Minor

| Done | Location                                      | Category                   | Problem                                                                                                                                                                                                                                                                                                                                                                                                                    | Suggestion                                                                                                                                         |
| ---- | --------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | `apps/web-app/lib/token-editors/types.ts:3,5` | Dead code / plan deviation | `types.ts` still imports and re-exports `TokenType` from `built-in.ts`, but `plan.md`'s Step 2 explicitly said to "remove the now-dead `TokenFilterMetadata` export and the `TokenType` re-export it depended on"; nothing imports `TokenType` from `types.ts` (grep confirms only `built-in.ts` itself uses it), so this re-export is unused and creates an unnecessary circular type dependency between the two modules. | Fixed — removed the dead `import type { TokenType }` / `export type { TokenType }` lines from `types.ts`; `build`/`lint`/`test` re-verified green. |

### 🔵 Info / Suggestions

| Done | Location                      | Category                | Problem                                                                                                                                                                                                                                                   | Suggestion                                                                                               |
| ---- | ----------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [ ]  | `docs/project.md:154,199,216` | Documentation staleness | The prior feature's changelog/API-table entries still describe `TokenEditorExtension` as `{ filter, editor }`, which is now `{ type, editor }` — expected to go stale mid-feature and not a defect in this PR, but flagging so `/sdd-archive` updates it. | No action needed now; `/sdd-archive` for this feature should refresh these `docs/project.md` references. |

## Acceptance Criteria Coverage

| AC                                                                         | Test                                                                                                                                                                       | Status     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| AC-01: canonical DTCG type list matches 2025.10 spec                       | `packages/token-core/src/token-types.test.ts`                                                                                                                              | ✅ Covered |
| AC-02: non-standard file flagged distinctly, valid/invalid unchanged       | `apps/web-app/components/FolderOverview.test.tsx`, `apps/web-app/lib/tokens/scan.test.ts`                                                                                  | ✅ Covered |
| AC-03: standard-no-builtin token gets JSON editor, round-trips             | `apps/web-app/components/TokenTree.generic-editor.test.tsx` (fallback case in the same file's `fallbackTree` tests), `apps/web-app/app/api/tokens/[...path]/route.test.ts` | ✅ Covered |
| AC-04: invalid JSON shows field error, does not stage                      | `apps/web-app/components/TokenTree.generic-editor.test.tsx`                                                                                                                | ✅ Covered |
| AC-05: non-standard token stays fully read-only regardless of registration | `apps/web-app/components/TokenTree.generic-editor.test.tsx` ("shows editable controls for a dimension token but not for a non-standard type")                              | ✅ Covered |
| AC-06: `defineConfig` throws on invalid `type`                             | `apps/web-app/lib/token-editors/define-config.test.ts`                                                                                                                     | ✅ Covered |
| AC-07: PATCH accepts any standard type, rejects non-standard               | `apps/web-app/app/api/tokens/[...path]/route.test.ts`                                                                                                                      | ✅ Covered |
| AC-08: override-ordering + fallback path, derived dynamically              | `apps/web-app/lib/token-editors/resolve-editor.test.ts`, `define-config.test.ts`                                                                                           | ✅ Covered |
| AC-09: existing dimension-editing tests pass unmodified                    | Full `pnpm test` run — all pre-existing dimension cases pass                                                                                                               | ✅ Covered |

## Verdict

- [x] ✅ Ready to merge
- [ ] 🟡 Merge after minor fixes (no re-review needed)
- [ ] 🟠 Requires fixes and re-review
- [ ] 🔴 Do not merge — significant issues found
