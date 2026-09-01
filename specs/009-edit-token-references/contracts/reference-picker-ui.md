# Contract: Reference Picker UI

Covers the three new `apps/web-app` components and the two repaired
`design-system` components. Every component gets its own PascalCase folder with
a co-located unit test (`*.test.tsx`) and accessibility test
(`*.a11y.test.tsx`) per Principle X.

---

## `design-system`: `Command` (repaired)

`packages/design-system/src/components/Command/Command.tsx`

- Replace the `@/registry/*` imports with real relative imports
  (`../Dialog/Dialog.tsx`) and the `cmdk` package.
- Export set unchanged from the stub: `Command`, `CommandInput`, `CommandList`,
  `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`,
  `CommandShortcut`, `CommandDialog`.
- `Command.css` audited to `--dtcg-ed-*` tokens only — no hardcoded colours,
  spacing, radii (Principle XII / `DESIGN.md`).
- No behavioural additions beyond what `cmdk` provides.

**Tests**: renders input + list + items; `CommandEmpty` shows when no children
match; `axe` clean.

---

## `design-system`: `Combobox` (replaced)

`packages/design-system/src/components/Combobox/Combobox.tsx` — replace the
hardcoded demo with a **generic controlled** combobox.

```ts
interface ComboboxProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  items: readonly T[];                       // already filtered + sorted by the caller
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  isItemDisabled?: (item: T) => boolean;     // disabled rows: not selectable by kbd/pointer, announced unavailable
  onSelect: (item: T) => void;               // never fired for a disabled item
  selectedKey?: string;                      // marks the staged/current item
  inputLabel: string;                        // accessible name for the search field
  triggerLabel: string;                      // accessible name for the trigger
  triggerContent: React.ReactNode;           // what the closed trigger shows
  emptyContent: React.ReactNode;             // shown when items is empty
  loading?: boolean;                         // shows loadingContent instead of the list
  loadingContent?: React.ReactNode;
}
```

- Composition: `Popover` + `PopoverTrigger` (a `Button`, `role="combobox"`,
  `aria-expanded`, `aria-controls`) + `PopoverContent` > `Command` with
  **`shouldFilter={false}`** (caller owns filtering — research §2).
- `query` / `items` are controlled; the component never filters or sorts.
- `isItemDisabled(item)` → that row is a `<CommandItem disabled>`: cmdk skips it
  in arrow navigation, it never becomes the `aria-activedescendant`, and
  `onSelect` is never called for it. `renderItem` still renders it (greyed, with
  its icon/label) so the user sees *why* it can't be picked.
- `onOpenChange(false)` on select and on Escape; focus returns to the trigger.
- `selectedKey` renders `aria-current="true"` + a visible check on that row.
- `loading` swaps the list region for `loadingContent` (distinct from
  `emptyContent`).
- `Combobox.css`: `--dtcg-ed-*` tokens only.

**Tests**: controlled query round-trips; `onSelect` fires with the item;
`onSelect` never fires for an `isItemDisabled` row and arrow-key nav skips it;
Escape closes + refocuses trigger; `selectedKey` marks the row; `loading`
shows `loadingContent`, not `emptyContent`; `items: []` shows `emptyContent`
and nothing is selectable; `axe` clean on the open popover including a disabled
row (announced unavailable, not silently absent).

---

## `apps/web-app`: `ReferenceEditControl`

`components/ReferenceEditControl/` — extracted from `TreeTokenNode.tsx` path 1.

**Props**: `{ node, currentName, onNameChange, nameAriaLabel, headingId,
rowTestId, effectiveType, headerExtra, errors, resolved, onStageEdit }` — the
same values path 1 uses today plus `onStageEdit`.

**Renders**: the existing `TokenBlock` wrapper; inside the Value field, the
resting state = `TokenReferenceValue` (feature 007, unchanged) for the
current/pending reference **plus** a `TokenReferencePicker` trigger. When no
`resolved` view is available (index build failed) it falls back to the raw
alias string exactly as today, and — if a catalogue later loads — still offers
raw-text editing (FR-021).

**Tests**: resting state matches today's path-1 output (snapshot parity);
trigger present and labelled; staging an edit calls
`onStageEdit(node.path, { value })`; name-error branch unchanged; `axe` clean.

---

## `apps/web-app`: `TokenReferencePicker`

`components/TokenReferencePicker/` — the `Combobox` instance.

**Props**: `{ editedTokenPath, currentReferenceValue, pendingReferenceValue,
onStageEdit }`.

**Behaviour**

| Ref | Behaviour |
| --- | --- |
| FR-001 | Trigger labelled `Repoint reference for <displayPath>`; opens the popover. |
| FR-023 | On first open, calls `useReferenceCatalogue`; `status: "loading"` → `loading` state in the popover. |
| FR-004 | Passes `query` + `candidate-filter(catalogue.candidates, query, editedToken)` result to `Combobox` as `items`. |
| FR-020 | Empty query → `candidate-filter` returns the three-band ordering. |
| FR-017 | `items: []` → `Combobox` `emptyContent` ("No tokens found"); nothing selectable. |
| FR-009..FR-015 | Each row renders a compact `<CandidatePreview candidate />` marker (icon + short label per `CandidateRowState.diagnostic`); the highlighted row's full preview + hypothetical edited-token preview + diagnostics go in the `aria-live="polite"` region. |
| FR-013 / FR-014 / FR-024 | `isItemDisabled = (c) => isCircularIfSelected(editedTokenPath, c)` — the token's own path and any path whose chain passes through it are disabled rows with the "circular-reference" icon + label; not arrow-navigable, `onSelect` never fires, popover stays open (research §4a). |
| FR-016 | A missing / group candidate is **not** disabled — its row is selectable; only the preview flags it. |
| FR-006 | `onSelect(candidate)` (selectable only) → `onStageEdit(editedTokenPath, { value: "{"+candidate.displayPath+"}" })`, then close. |
| FR-019 | If the chosen alias equals `pendingReferenceValue ?? currentReferenceValue`, stage nothing; still close. |
| FR-018 | `selectedKey` = displayPath of `pendingReferenceValue ?? currentReferenceValue` if it names a candidate. |
| FR-021 | `status: "error"` → render a plain `<input>` bound to the raw alias text with `onStageEdit` on change; no list, no previews. |
| clarified | Escape / select closes; focus to trigger. |

**Tests**: loading→ready transition; filter wiring (type → narrowed `items` in
order); empty state; select stages the right alias; **the edited token's own
path and a cycle-closing path are disabled rows — Enter/click stages nothing,
popover stays open (SC-008); arrow nav skips them**; a missing/group candidate
stays selectable; re-select current = no-op; re-open shows staged target as
current; error state offers raw-text edit; keyboard open→arrow→enter; `axe`
clean.

---

## `apps/web-app`: `CandidatePreview`

`components/CandidatePreview/` — presentational.

**Props**: `{ candidate: ReferenceCandidate, rowState: CandidateRowState,
hypothetical?: HypotheticalResolution }`.

**Renders**

- **Compact form** (in every row): the icon + short text label for
  `rowState.diagnostic` — `"circular"` → the distinct circular-reference icon +
  "circular-reference" label (FR-024); `"missing"` / `"group"` → their own
  icons + labels; `"none"` → no marker.
- **Full form** (highlighted row, `hypothetical` set): per `candidate.preview`
  entry, mode label (when >1) and either the resolved literal via
  `resolveBuiltInContract(effectiveType)?.Preview?.({ value })` falling back to
  raw text — **identical delegation to `TokenReferenceValue`'s
  `formatLiteralValue`** (FR-009, reuse it or factor it into a shared helper) —
  or a `ReferenceWarning` (feature 007) for a non-resolved outcome (FR-010,
  FR-011, FR-015); plus an "edited token would resolve to" block over
  `hypothetical.perMode[i].chain`. A `circular` outcome names the cycle
  (FR-014). The token's own path is presented as circular, not a separate
  "self-reference" notice (FR-013).
- `CandidatePreview` is **presentational only** — it never decides
  selectability; `rowState.selectable` (set by the picker via
  `isCircularIfSelected`) drives `<CommandItem disabled>`.

**Tests**: colour candidate → swatch (not raw text); chain candidate →
end-of-chain value; multi-mode candidate → one labelled row per mode;
`diagnostic: "circular"` (own path AND multi-hop cycle) → circular icon +
"circular-reference" label; missing / group → their markers; `axe` clean.

---

## `TreeTokenNode` (edited)

Path 1 becomes:

```tsx
const reference = parseReference(node.value);
if (reference !== undefined) {
  return (
    <ReferenceEditControl
      node={node}
      currentName={currentName}
      onNameChange={handleNameChange}
      nameAriaLabel={`${node.name} name`}
      headingId={headingId}
      rowTestId={rowTestId}
      effectiveType={effectiveType}
      headerExtra={referencedByBadge}
      errors={errors}
      resolved={node.references?.[0]}
      onStageEdit={onStageEdit}
    />
  );
}
```

Net effect: `TreeTokenNode.tsx` drops below the 300-line ceiling. Existing
`TreeTokenNode` tests for the reference branch move to
`ReferenceEditControl.test.tsx`; a thin "delegates to ReferenceEditControl for a
reference value" test stays.
