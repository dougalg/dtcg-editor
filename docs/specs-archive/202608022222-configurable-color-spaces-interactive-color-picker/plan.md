# Implementation Plan: Configurable Color Spaces + Interactive Color Picker

## Overview

Two additive halves, sharing one generic mechanism:

1. **Generic `editorOptions` mechanism** — `TokenEditorExtension` gains an optional `editorOptions?: unknown` field; `TokenTypeContract` gains an optional `editorOptionsSchema?: z.ZodType<unknown>`; `defineConfig` validates the former against the latter (when both present) at config-load time, folding failures into the existing `DtcgEditorConfigError` issue list. `resolveEditorForType` returns `{ editor, editorOptions }` instead of a bare editor. `TokenTypeEditorProps` gains `options?: unknown`, threaded from `TokenTree.tsx` into whichever editor renders. This is pure plumbing — no new UI, no new validation _policy_, just a channel type-specific config can flow through.
2. **`color`'s two consumers of that channel**: (a) `ColorEditorOptions.colorSpaces` restricts the colorSpace `<select>`'s offered options (authoring-only, per FR-05's "existing token keeps working" guarantee); (b) a new native `<input type="color">` in both `ObjectColorEditor` and `LegacyHexColorEditor`, converting through a new `packages/token-type-color/src/conversion.ts` module backed by `colorjs.io`.

`FR-01` (`TokenEditorExtension.type` → `DtcgTokenType`) is a small, independent, low-risk type-only change bundled into the same plan since it touches the same file as `FR-02` and the same PR.

## Architecture Decisions

- **Color-conversion library: `colorjs.io` (`^0.7.1`)**, imported via its tree-shakable `colorjs.io/fn` entry point (`parse`, `to`, `toGamut`, `serialize`, plus `import { spaces } from "colorjs.io/fn"` to register all needed color spaces once at module load).
  - **What a hand-rolled alternative would cost**: 6 of the 14 DTCG colorSpaces (`lab`, `lch`, `oklab`, `oklch`, `xyz-d65`, `xyz-d50`) plus 4 wide-gamut RGB variants (`display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`) require correct 3×3 chromatic-adaptation matrices (Bradford D65↔D50) and non-linear transfer functions per CSS Color 4 §10/§12; a transcription error in any matrix produces plausible-looking but numerically wrong colors that are hard to catch by inspection (exactly the kind of silent-deviation risk `docs/project.md`'s "DTCG spec compliance is mandatory" convention flags as unacceptable). This is real, tested, spec-conformance-critical math — not boilerplate `Intl`/`structuredClone` territory the Minimal Dependencies bar reserves for built-ins.
  - **Why this library over alternatives** (e.g. `culori`, `color-convert`, `colord`): `colorjs.io` is written and maintained by the co-editors of the CSS Color 4/5 spec itself (the same spec DTCG's Color module's 14 `colorSpace` IDs are drawn from verbatim — `srgb`, `srgb-linear`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50` map 1:1 onto its space registry), used as a reference/conformance implementation, and ships `toGamut()` for exactly the "clip an out-of-gamut value into sRGB for the native picker" need in FR-06. `culori` covers similar ground but is oriented at data-viz interpolation, not CSS-spec gamut-mapping semantics; picking the spec-editor-maintained library removes an entire class of "does our clipping match what the browser would do" risk.
  - **Bundle size**: because `colorSpace` is a runtime-configurable value on every token (not a build-time choice), all 14 space definitions must be registered regardless of which library is chosen — there is no smaller tree-shaken subset available to either candidate for this feature's actual requirement. `colorjs.io/fn`'s functional API (vs. the default class-based `.` entry) still tree-shakes the unused OOP/`Color` class wrapper and CSS-string-parsing machinery neither editor branch needs, since conversion here always starts from typed `ColorObjectValue`/hex, never raw CSS text.
  - Added to `docs/project.md`'s Approved Dependencies at implement time with this same justification (Minimal Dependencies process).
- **`editorOptionsSchema` validation is opt-in per contract, not enforced generically** (FR-03): a built-in type with no `editorOptionsSchema` (i.e. every type except `color`, for this feature) passes `editorOptions` through unvalidated, consistent with how a non-built-in type's `editor`/whole entry is already trusted as-is elsewhere in `defineConfig`. No new validation is retrofitted onto `dimension`.
- **Picker sync is derived, not stateful**: rather than an effect that re-syncs the native `<input type="color">`'s `value` whenever the numeric/hex fields change, the picker's `value` is computed fresh on every render directly from the editor's current `value` prop via `toSrgbHex(value)`. This makes AC-10 ("editing a numeric field updates the picker") automatically true by construction — there is no separate sync state to fall out of sync — at the cost of running a cheap conversion on every render, which the NFR section already accepts as negligible.
- **Allow-list handling keeps the current out-of-list colorSpace selectable** (FR-05/AC-06): the `<select>`'s option list is `configuredSpaces ?? COLOR_SPACES`, with `value.colorSpace` unioned in (deduped) if it isn't already present — not filtered out and not force-migrated. This is a pure rendering-layer change in `ObjectColorEditor`; nothing about `canEdit`, `checkColorValueIssues`, or server-side validation changes, matching FR-05's explicit "no new server-side validation" scope.
- **`editorOptions` on `TokenTypeEditorProps` is threaded, not defaulted, by `TokenTree.tsx`**: `resolveEditorForType`'s resolved `editorOptions` (possibly `undefined`) is passed straight through as `options` to whichever editor renders (`DimensionEditor` via the existing narrow path, or the generic/color path). Each editor component decides its own fallback (e.g. `ColorEditor` treats `options === undefined` as "all 14 spaces", matching FR-04's zero-config behavior) rather than `TokenTree.tsx` embedding per-type defaulting logic it has no business knowing about.

## Implementation Steps

### Step 1: `TokenTypeContract` + `TokenTypeEditorProps` — generic `editorOptions` channel

- [x] `packages/token-type-contract/src/contract.ts`: add `readonly editorOptionsSchema?: z.ZodType<unknown>;` to `TokenTypeContract<TValue>`; add `readonly options?: unknown;` to `TokenTypeEditorProps<TValue>`.
- [x] `packages/token-type-contract/src/contract.test.ts`: extend existing contract-shape tests to cover a contract with `editorOptionsSchema` present/absent (construction only — validation logic itself lives in `defineConfig`, tested in Step 3).
- Files: `packages/token-type-contract/src/contract.ts`, `packages/token-type-contract/src/contract.test.ts`.

### Step 2: `apps/web-app/lib/token-editors/types.ts` — `TokenEditorExtension` shape + `DtcgTokenType`

- [x] Change `TokenEditorExtension.type` from `string` to `DtcgTokenType` (import from `@dtcg-editor/token-core`, already a dependency of `apps/web-app`).
- [x] Add `readonly editorOptions?: unknown;` to `TokenEditorExtension`.
- [ ] Add an Architecture Decisions row to `docs/project.md` at archive time noting this reverses the 2026-08-01 "keep it as `string`" decision, per `feature.md`'s FR-01 framing (config-author DX only; `defineConfig`'s `isDtcgTokenType` runtime check remains the actual gate).
- Files: `apps/web-app/lib/token-editors/types.ts`.

### Step 3: `apps/web-app/lib/token-editors/define-config.ts` — validate `editorOptions`

- [x] Import `resolveBuiltInContract` from `./built-in.ts`.
- [x] In `describeInvalidExtension` (or a sibling helper called alongside it — `describeInvalidExtension` currently only inspects shape, not cross-references `built-in.ts`, so a new `describeInvalidEditorOptions(entry, index)` helper keeps that separation), when `candidate.editorOptions !== undefined`:
  - Resolve the built-in contract for `candidate.type` (only if `candidate.type` already passed the `isDtcgTokenType` check — an invalid `type` already produces its own issue and short-circuits further checks on that entry, avoiding a confusing double error).
  - If a contract exists and declares `editorOptionsSchema`, run `.safeParse(candidate.editorOptions)`; on failure, push one issue per Zod issue: `extensions[${index}].editorOptions: ${issue.message}` (mirrors the existing `tokensDir` issue-message shape).
  - If no built-in contract, or the contract has no `editorOptionsSchema`, no validation runs — `editorOptions` passes through as opaque `unknown` (FR-03).
- [x] `describeInvalidExtension`'s `editor` requiredness check is unchanged — an entry with `editorOptions` but no valid `editor` still fails for the existing "editor must be a function" reason (AC-02), not a new one.
- Files: `apps/web-app/lib/token-editors/define-config.ts`, `apps/web-app/lib/token-editors/define-config.test.ts` (new cases: AC-03 invalid colorSpace, AC-04 empty allow-list, valid `editorOptions` passes, `editorOptions` on a type with no schema passes through unchecked, AC-02's existing case still holds with `editorOptions` also present).

### Step 4: `apps/web-app/lib/token-editors/resolve-editor.ts` — return `{ editor, editorOptions }`

- [x] Change `resolveEditorForType`'s return type from `TokenEditorExtension["editor"] | undefined` to `{ editor: TokenEditorExtension["editor"]; editorOptions: unknown } | undefined`, returning the whole matched entry's `editor`/`editorOptions` pair (`editorOptions` defaults to `undefined` when the matched entry doesn't declare it — `TokenEditorExtension.editorOptions` is already optional).
- [x] Update its doc comment's shape description accordingly; first-match-wins lookup behavior itself is unchanged.
- Files: `apps/web-app/lib/token-editors/resolve-editor.ts`, `apps/web-app/lib/token-editors/resolve-editor.test.ts`.

### Step 5: `apps/web-app/components/TokenTree.tsx` — thread `editorOptions` through

- [x] Update the `resolvedEditor` call site: destructure `{ editor, editorOptions } = resolveEditorForType(...) ?? {}` (both `undefined` when no match, preserving today's "no match" behavior for `DimensionEditor`/`GenericEditor`/`FallbackValueEditor` selection logic unchanged).
- [x] Rename the local `resolvedEditor` usages accordingly (`DimensionEditor`/`GenericEditor` casts now derive from `editor`, not the old bare-editor `resolvedEditor`).
- [x] Pass `options={resolvedEditorOptions}` into `<GenericEditor .../>`'s render (the color/other-generic-type path). `<DimensionEditor .../>`'s render also receives `options={resolvedEditorOptions}` for interface consistency (it's part of `TokenTypeEditorProps` now), even though `DimensionEditor` ignores it — no behavior change for dimension tokens since `dimensionTokenType` declares no `editorOptionsSchema` and nothing in its rendering reads `options`.
- Files: `apps/web-app/components/TokenTree.tsx`, `apps/web-app/components/TokenTree.test.tsx` (no new assertions expected here — existing tests should pass unmodified, confirming zero behavior change for non-color types; add one covering a color extension's `editorOptions` reaching `ColorEditor` via a fake registered editor component asserting on received props).

### Step 6: `packages/token-type-color` — add `colorjs.io` dependency + `conversion.ts`

- [x] `pnpm --filter @dtcg-editor/token-type-color add colorjs.io@^0.7.1` (per CLAUDE.md's pnpm convention — never hand-edit `package.json` for a dependency).
- [x] New `packages/token-type-color/src/conversion.ts`:
  - Module-load-time side effect: registers each of the 14 needed spaces explicitly via `ColorSpace.register(space)` (confirmed against installed `colorjs.io@0.7.1` source: `colorjs.io/fn`'s own `spaces` re-export does _not_ auto-register — only `colorjs.io/spaces`, a different entry point that registers colorjs.io's full ~40-space catalog, does).
  - `srgbHexToColorSpaceComponents(hex, targetSpace): [number, number, number] | null` — `parse(hex)` → `to(color, targetSpace)` → `.coords`. Returns `null` (not a magic fallback) on failure since its result is written back into the token's real `components` via the caller's `onChange` — a silent `[0,0,0]` here would risk corrupting real data.
  - `colorValueToSrgbHex(value): string` — legacy bare-hex passes through; object value builds a colorjs.io color (`"none"` → `0`, display-only, never written back), `to("srgb")`, `toGamut({ space: "srgb" })`, `serialize(..., { format: "hex", collapse: false, alpha: false })` (explicit `collapse`/`alpha` needed — colorjs.io's hex format collapses to 3/4-digit and embeds alpha by default, which `<input type="color">` can't accept). Falls back to `"#000000"` on failure/NaN — safe since this value is display-only, never written back.
- [x] New `packages/token-type-color/src/conversion.test.ts` (`node --test`): round-trips a known sRGB hex through each of the 14 spaces and back (small epsilon); wide-gamut `display-p3`/`rec2020` values clip to valid 6-digit hex; legacy passthrough, `"none"`-component display handling, and NaN/malformed-input fallback behavior for both functions.
- [x] Added `colorjs.io` to `docs/project.md`'s Approved Dependencies with the Minimal Dependencies justification.
- Files: `packages/token-type-color/src/conversion.ts` (new), `packages/token-type-color/src/conversion.test.ts` (new), `packages/token-type-color/package.json`.

### Step 7: `packages/token-type-color/src/color.ts` — `ColorEditorOptions` + schema + `defineColorConfig`

- [x] Add:
  ```ts
  export interface ColorEditorOptions {
  	readonly colorSpaces?: readonly ColorSpace[];
  }

  export const ColorEditorOptionsSchema: z.ZodType<ColorEditorOptions> =
  	z.object({
  		colorSpaces: z.array(z.enum(COLOR_SPACES)).min(1).optional(),
  	});

  export function defineColorConfig(
  	options: ColorEditorOptions,
  ): ColorEditorOptions {
  	return options;
  }
  ```
  (`defineColorConfig` is a typed identity function per FR-04 — no runtime validation, matching the doc comment's "compile-time only" framing; `defineConfig`'s Step 3 schema check remains the real gate. Implemented with `readonly ColorSpace[] | undefined` on `colorSpaces` — `exactOptionalPropertyTypes` requires `undefined` in the property's own type for `z.ZodType<ColorEditorOptions>` to type-check against the schema's inferred optional output.)
- [x] `packages/token-type-color/src/color.test.ts`: `ColorEditorOptionsSchema` accepts `undefined`, a valid non-empty `colorSpaces` array, an array containing only valid enum members; rejects an empty array (AC-04) and an array containing an invalid space string (AC-03).
- Files: `packages/token-type-color/src/color.ts`, `packages/token-type-color/src/color.test.ts`.

### Step 8: `packages/token-type-color/src/token-type.ts` — wire `editorOptionsSchema`

- [x] Add `editorOptionsSchema: ColorEditorOptionsSchema` to `colorTokenType`.
- Files: `packages/token-type-color/src/token-type.ts`.

### Step 9: `packages/token-type-color/src/editor.tsx` — allow-list dropdown + native picker

- [x] `ColorEditor`'s signature becomes `{ value, onChange, options }: TokenTypeEditorProps<ColorValue>`; cast `options as ColorEditorOptions | undefined` (unknown-erasure cast, same pattern already used for `TokenTypeContract<unknown>` erasure in `built-in.ts`) and pass the resolved `colorSpaces` (or `undefined`) down to `ObjectColorEditor` as a new prop; `LegacyHexColorEditor` needs no `colorSpaces` prop (legacy hex has no colorSpace dropdown — Out of Scope confirms the legacy path is untouched by the restriction).
- [x] `ObjectColorEditor` gains a `colorSpaces?: readonly ColorSpace[]` prop. Its `<select>`'s options become: `(colorSpaces ?? COLOR_SPACES)` unioned with `value.colorSpace` (dedup via e.g. building a `Set`, then rendering in `COLOR_SPACES`'s canonical order so the option list stays stably ordered regardless of allow-list order) — implements FR-05/AC-05/AC-06.
- [x] Both `ObjectColorEditor` and `LegacyHexColorEditor` gain:
  ```tsx
  <label>
  	<span className={styles.labelText}>Pick a color</span>
  	<input
  		type="color"
  		value={colorValueToSrgbHex(value)}
  		onChange={handlePickerChange}
  	/>
  </label>
  ```
  placed directly above the existing swatch/colorSpace-or-hex-input row (Open Question on exact layout resolved here: picker first, since it's the primary "start here" affordance FR-06's user story describes, with the existing fields below for fine-tuning — matches the "starting point, not the only way" framing in `feature.md`'s User Stories).
  - `ObjectColorEditor`'s `handlePickerChange(event)`: `srgbHexToColorSpaceComponents(event.target.value, value.colorSpace)` → `onChange({ ...value, components: [c0, c1, c2] })`. Alpha/hex fields on `value` are spread through unchanged (AC-11).
  - `LegacyHexColorEditor`'s `handlePickerChange(event)`: `onChange(event.target.value)` directly (the picker's own hex output _is_ the legacy value — no space conversion needed) and updates the existing `hexInput` local state to match, so the adjacent text field reflects the pick too.
- [x] Real visible `<label>` wrapping the picker (implicit-association pattern, per the existing 2026-07-28 Architecture Decision's established convention) — satisfies AC-12's labeling half.
- [x] `checkColorValueIssues`-flagged out-of-range values (Open Question, resolved): the picker operates on whatever numeric values are currently staged regardless of flagged issues — `colorValueToSrgbHex`'s `toGamut` clipping already produces a sane displayed color for an out-of-range value, and picking a new color always produces a fresh, necessarily-in-range set of components for the target space (since it's derived from a valid sRGB hex), which is a natural way to _fix_ an out-of-range value rather than a reason to disable the control.
- [x] Component-level tests added at `apps/web-app/lib/token-editors/color-editor.test.tsx` (that workspace is the nearest one with a JSX-capable test runner — `packages/token-type-color` only has `node --test`, which can't load `.tsx`), covering AC-05, AC-06, AC-09 (both an RGB-family and a non-RGB space), AC-10 (including a colorSpace-switch re-sync), and AC-11.
- [x] `srgbHexToColorSpaceComponents`'s null-on-failure design (see Step 6) is honored in `handlePickerChange`: `onChange` is skipped entirely when conversion fails, rather than writing back a corrupting fallback.
- Files: `packages/token-type-color/src/editor.tsx`, `packages/token-type-color/src/editor.module.css` (minor: picker sizing/spacing, no new custom properties needed — reuse existing `--border`/spacing tokens already used elsewhere in this stylesheet).

### Step 10: `apps/web-app/dtcg-editor.config.mts` — optional sample update

- [x] Add a commented-out or minimal example entry demonstrating `defineColorConfig`, e.g.:
  ```ts
  import { colorTokenType } from "@dtcg-editor/token-type-color/token-type";
  import {
  	ColorEditor,
  	defineColorConfig,
  } from "@dtcg-editor/token-type-color";
  // extensions: [
  //   { type: "color", editor: ColorEditor, editorOptions: defineColorConfig({ colorSpaces: ["srgb", "hsl", "oklch"] }) },
  // ],
  ```
  Kept commented/inert (matching this file's current `extensions: []` zero-config state) so no real-world sample-data token's colorSpace is silently restricted; purely illustrative per Technical Scope's "optional".
- Files: `apps/web-app/dtcg-editor.config.mts`.

### Step 11: Accessibility test coverage (AC-12)

- [x] Extend the color-editor's existing `a11y` Vitest browser project coverage (`packages/token-type-color` has no `*.a11y.test.tsx` of its own — confirmed the a11y suite lives entirely under `apps/web-app`, per `docs/project.md` — so `apps/web-app/lib/token-editors/built-in.a11y.test.tsx`'s existing "the built-in color editor has no WCAG 2.2 AA violations" case is the right place; it already renders `colorTokenType.Editor` with a real value, so it picked up the new picker automatically with no test-code change needed — reran it and confirmed zero violations).
- [x] Extend the existing Playwright keyboard-only flow (`apps/web-app/e2e/keyboard-navigation.spec.ts`) with a new test tabbing from the file list through to a `color_scale.tokens.json` token's "Pick a color" input, asserting it's reachable via Tab, has a visible focus indicator, and has the accessible name "Pick a color" (scoped via the input's nearest `<li>` ancestor, since every color token on the page has its own picker) — without attempting to drive the OS-level color-picker widget itself, which is outside Playwright's DOM control.
- [x] Found (but did not fix, as out of this feature's scope) a pre-existing accessibility bug while probing a page-level axe scan of `color_scale.tokens.json`: `TokenTree.tsx`'s `role="alert"` on the `<ul>` wrapping out-of-range color issues breaks axe's `listitem` check, because setting an ARIA `alert` role on a `<ul>` removes its implicit list semantics for its `<li>` children. Triggered by the sample data's `invalid-hue` token, not by anything this feature added — flagged for a separate fix, not carried into this branch.
- Files: `apps/web-app/lib/token-editors/built-in.a11y.test.tsx` (unmodified, re-verified), `apps/web-app/e2e/keyboard-navigation.spec.ts`.

### Step 12: Full verification pass

- [x] `pnpm build` (all packages) — clean, including `apps/web-app`'s `next build` TypeScript pass confirming the `TokenTypeEditorProps`/`TokenEditorExtension` shape changes propagate correctly under strict TS.
- [x] `pnpm lint` — clean across all 6 packages.
- [x] `pnpm test` (unit + `a11y` Vitest projects + `node --test` packages + Playwright e2e) — 13/13 turbo tasks green: 111 `node --test` cases across `token-core`/`token-type-contract`/`token-type-color`/`token-type-dimension`/`errors`, 169 Vitest cases (`unit` + `a11y` projects) in `apps/web-app`, and 5/5 Playwright e2e specs including the new AC-12 picker-reachability test — run against a real `next build && next start`, not just `next dev`.
- [x] `pnpm format:check` — clean (after `prettier --write` on the files this feature touched).
- [x] Manual/interactive verification of AC-05/AC-06/AC-09/AC-10/AC-11 was covered by the new `apps/web-app/lib/token-editors/color-editor.test.tsx` component tests (simulating real picker/dropdown/field DOM events via Testing Library — equivalent fidelity to a hand-driven browser session for these ACs) plus the Playwright run against the production server, rather than a separate manual `pnpm --filter web-app dev` session.
- [x] Found and flagged (not fixed — out of scope) one pre-existing a11y bug unrelated to this feature; see Step 11.

## Acceptance Criteria Mapping

| AC                                                                                         | Verified By                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01: `type` is `DtcgTokenType`, runtime check unchanged                                  | Type-level: `tsc` build (Step 2); runtime: existing `define-config.test.ts` invalid-type case still passes unmodified                                    |
| AC-02: `editor` remains required                                                           | `define-config.test.ts` new case: `editorOptions` present, `editor` invalid → still fails                                                                |
| AC-03: invalid `colorSpaces` value throws at config load                                   | `define-config.test.ts` new case (Step 3) + `color.test.ts`'s `ColorEditorOptionsSchema` rejection case (Step 7)                                         |
| AC-04: empty `colorSpaces` array throws at config load                                     | Same as AC-03, empty-array case                                                                                                                          |
| AC-05: dropdown offers only configured spaces                                              | `editor.test.tsx`/a11y or unit test rendering `ObjectColorEditor` with `colorSpaces={["srgb","hsl"]}` (Step 9)                                           |
| AC-06: out-of-allow-list token stays editable, active value preserved                      | Unit test: token with `colorSpace: "lab"`, `colorSpaces: ["srgb"]` configured — dropdown shows `lab` selected + `srgb` option                            |
| AC-07: saving an out-of-allow-list-colorSpace edit succeeds server-side                    | No `route.ts` change (Step 3-9 don't touch it) — existing PATCH tests continue passing unmodified, confirming no new rejection                           |
| AC-08: round-trip fidelity for out-of-allow-list tokens                                    | Existing `token-core` round-trip tests unaffected (no `token-core` changes in this feature)                                                              |
| AC-09: picker updates numeric fields across all colorSpaces                                | `conversion.test.ts` (Step 6) + `editor` component test simulating a pick and asserting `onChange` payload per colorSpace family                         |
| AC-10: manual field edit updates picker display                                            | Derived-not-stateful design (Architecture Decisions) makes this true by construction; component test asserts picker `value` after a simulated field edit |
| AC-11: picking never changes alpha                                                         | Component test: pick with `alpha` set, assert `onChange` payload's `alpha` unchanged                                                                     |
| AC-12: picker has visible label, zero new axe violations, reachable via keyboard-only flow | Step 11's a11y + Playwright additions                                                                                                                    |
| AC-13: `defineColorConfig` type-checks with no cast                                        | `tsc` build against a `dtcg-editor.config.mts`-shaped usage (Step 10's sample, even commented, is still type-checked by `tsc` since it's real source)    |

## Risks & Mitigations

- **Risk**: `colorjs.io`'s exact space-registration API (auto vs. explicit `ColorSpace.register`) isn't fully confirmed from source inspection alone. → **Mitigation**: Step 6 explicitly calls out verifying this against the installed package during implementation before writing `conversion.ts`'s real logic; `conversion.test.ts`'s round-trip coverage across all 14 spaces will immediately fail loudly if registration is missing for any space, rather than silently producing wrong numbers.
- **Risk**: `"none"` color components (valid per DTCG/CSS Color 4 for indicating a missing/undefined channel) have no direct `colorjs.io` coordinate equivalent. → **Mitigation**: explicitly scoped to display-only approximation (treated as `0` solely for computing what the native picker shows) — never written back into the token's actual `components`, so it can't corrupt a `"none"`-bearing value's real data (only Step 6's `colorValueToSrgbHex`, not `srgbHexToColorSpaceComponents`, ever touches this case, and only in the read direction).
- **Risk**: Threading `options` through `TokenTypeEditorProps` touches the same render path every token type flows through (`TokenTree.tsx`), so a mistake could regress dimension-token editing. → **Mitigation**: Step 5 explicitly calls out that existing `TokenTree.test.tsx` assertions must pass unmodified as the regression signal; `options` is additive-only (optional field, unused by `DimensionEditor`).
- **Risk**: Native `<input type="color">` keyboard/OS-picker behavior varies by browser/OS and can't be fully driven by Playwright. → **Mitigation**: FR-06/AC-12 already scope the Playwright assertion to "reachable and has an accessible name," not full OS-picker interaction, matching feature.md's own scope; Step 11 mirrors that.

## Estimated Complexity

**Medium.** The generic `editorOptions` mechanism (Steps 1-5) is small, mechanical, and low-risk — it's pure plumbing mirroring patterns already established (`resolveBuiltInContract`, unknown-erasure casts, Zod-issue folding in `defineConfig`). The color-specific half (Steps 6-9) carries the real complexity: a new third-party dependency, genuine numeric conversion logic across 14 color spaces with a documented lossy edge case (gamut clipping, `"none"` display approximation), and accessibility coverage for a new interactive control. No architectural risk (no new package, no new cross-cutting pattern beyond what FR-02/FR-03 already establish as generic) — the complexity is concentrated in getting the color math and its test coverage right, not in system design.
