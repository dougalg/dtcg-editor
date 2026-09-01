# Quickstart: Edit Token References

Validation guide — proves the feature works end to end. Assumes a checkout of
branch `009-edit-token-references` with the feature implemented.

## Prerequisites

- Node + `pnpm` per repo root.
- `pnpm install` at the repo root.

## Unit + component tests

```bash
# design-system: repaired Command + new Combobox
pnpm --filter @dtcg-editor/design-system test

# web-app: catalogue transform, filter, hypothetical resolution, hook, components
pnpm --filter @dtcg-editor/web-app test
```

Expected: all green, including

- `lib/tokens/reference-catalogue.test.ts` — every token path present, no group
  paths, one candidate per multiply-defined path.
- `lib/tokens/candidate-filter.test.ts` — substring + match-position ordering;
  empty-query three-band ordering.
- `lib/tokens/candidate-selectability.test.ts` — own path, multi-hop cycle
  through the edited token, cross-mode cycle → circular (disabled); unrelated
  cycle / missing / group / clean → not disabled.
- `lib/tokens/hypothetical-resolution.test.ts` — resolved / chain / self /
  circular / missing / group outcomes for the highlighted candidate.
- `app/api/tokens/references/route.test.ts` — 200 body validates the schema;
  `loadTokenDirectory` `Err` → 500.
- `components/*/*.a11y.test.tsx` — zero `axe` violations on each new component
  and the open popover.

## Accessibility (browser tier)

```bash
pnpm --filter @dtcg-editor/web-app test:browser
pnpm --filter @dtcg-editor/design-system test:browser
```

Expected: `axe-core` zero WCAG 2.2 AA violations on `Combobox`, `Command`,
`TokenReferencePicker`, `CandidatePreview`, `ReferenceEditControl`.

## End-to-end (keyboard-only flow)

```bash
pnpm --filter @dtcg-editor/web-app exec playwright test edit-token-references
```

Fixture set: `apps/web-app/e2e/fixtures/token-references` (server on port
`3101`) — already contains cross-file, chained, broken, circular, group-target
and multi-mode tokens.

`e2e/edit-token-references.spec.ts` asserts, mouse never used:

1. Open a token file with a reference token; `Tab` to its reference row; the
   reference text shows with an edit trigger (FR-001).
2. `Enter`/`Space` on the trigger opens the popover; focus lands in the search
   field; a loading state shows until the catalogue GET resolves (FR-023).
3. Type part of another token's path; the list narrows to full-path substring
   matches in match-position order (FR-004); a mid-path fragment matches
   (not only the leaf).
4. `ArrowDown` through candidates; the live region announces each candidate's
   resolved value and, for the edited token, what it would resolve to
   (FR-009, FR-012, US2).
5. The edited token's own path and any cycle-closing path appear with the
   circular-reference icon + "circular-reference" label, are announced
   unavailable, are **skipped by `ArrowDown`**, and `Enter`/click on one stages
   nothing and keeps the popover open (FR-013, FR-014, FR-024, SC-008).
6. Highlight a candidate that resolves to a missing or group path → the preview
   flags it, but the row **is** selectable and can be staged (FR-016).
8. Type a query matching nothing → "No tokens found"; `Enter` selects nothing
   (FR-017).
9. `Enter` on a valid candidate → popover closes, focus returns to the trigger,
   the row now shows the new reference text; **not yet saved**.
10. Re-open the picker → the staged target is marked current (FR-018).
    Select it again → no additional edit staged (FR-019).
11. Attempt a cross-file navigation → the existing unsaved-changes dialog appears
    (FR-008). Choose "discard" → the reference reverts to its saved target.
12. Repoint again, then activate Save → the file is written; reload → the new
    reference persists.

## Manual round-trip check (SC-007)

```bash
# with the dev server running against a scratch copy of a token file
git -C <tokensDir> diff -- <the-edited-file>.json
```

Expected: exactly one changed line — the edited token's `$value` alias string.
No reordering, no whitespace/key churn elsewhere (Principle IX).

## Performance check (SC-004)

```bash
pnpm --filter @dtcg-editor/web-app test -- candidate-filter.bench
pnpm --filter @dtcg-editor/web-app exec playwright test edit-token-references-perf
```

Expected: keystroke→sorted-list p95 < 50 ms over a 1,000-path synthetic
catalogue; no Long Task > 50 ms recorded while typing a burst into the open
picker.

## Degradation check (FR-021)

Point the dev server at a directory the process can't fully read (or stub the
catalogue route to 500). Open the picker → it shows the raw alias text in an
editable input, no previews; editing + saving still works; the rest of the page
renders normally.
