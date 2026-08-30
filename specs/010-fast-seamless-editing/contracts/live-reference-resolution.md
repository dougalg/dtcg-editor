# Contract: Live Reference Resolution

Maps to spec FR-011, SC-005, and US1 scenario 3. Mechanism in `research.md` §3a; internals
in `data-model.md` §6. "In-file" = a token present in the currently-open file's tree.

## C-LR-1 — A committed edit updates every in-file dependent's preview

**Given** token `A` (in the open file) and tokens that reference `A` directly or through a
chain, all in the open file
**When** the user commits an edit to `A`'s value or name
**Then** each dependent's resolved-value preview reflects the new value within the SC-001
100 ms budget, in place, with no visible tree rebuild and no collapse of expanded groups.

## C-LR-2 — Non-dependents don't recompute or re-render

**Given** the same edit to `A`
**Then** for every token `Q ∉ {A} ∪ reverseDeps(A)`, `getResolvedPreview(Q)` returns the
same reference as before and `Q`'s row does not re-render (INV-17).

## C-LR-3 — Multi-hop chains resolve end to end

**Given** `C → {B}`, `B → {A}`, all in the open file
**When** the user commits an edit to `A`
**Then** both `B`'s and `C`'s previews update to `A`'s new resolved value.

## C-LR-4 — Becoming / ceasing to be a reference

**Given** `B → {A}` and `A` currently holds a literal value
**When** the user edits `A`'s value to a reference `{X}` (or vice-versa) and commits
**Then** `B`'s preview reflects `X`'s resolved value (or `A`'s new literal), live.

## C-LR-5 — Rename that dangles a reference

**Given** `B → {a}` where `a` is a token in the open file
**When** the user renames `a` to `a2` and commits
**Then** `B`'s preview shows an **unresolved** state (`{ kind: "unresolved" }`), not the
stale pre-rename value — updated live, not only after save.

## C-LR-6 — Cycles don't hang or crash

**Given** `A → {B}` and `B → {A}` (created via edits)
**When** either is committed
**Then** both previews render a cycle/unresolved marker (`{ kind: "cycle" }`), the resolver
returns in bounded time, and nothing throws (INV-16).

## C-LR-7 — Cross-file targets are unaffected by in-session edits

**Given** token `X` in the open file references `{base.color}`, which lives in another file
**When** the user commits any edit in the open file that does not touch `X`
**Then** `X`'s preview is unchanged — it resolves from the server `referenceView` value
(INV-18). (You cannot stage an edit to `base.color` from this view.)

## C-LR-8 — ≥ 100 dependents stay within budget

**Given** a token referenced by ≥ 100 other in-file tokens (present in the large fixture)
**When** the user commits an edit to it
**Then** all dependents' previews update within the SC-001 100 ms budget and the keystroke
path for continued typing is not blocked (recompute is `useDeferredValue`-wrapped).

## C-LR-9 — Resolution never reacts to an uncommitted draft

**Given** the user is mid-typing in `A`'s value field (draft not yet committed)
**Then** no dependent's preview changes until `A`'s edit is committed (blur / Enter /
debounce) — `getEffectiveNode`, and therefore the resolver, never observes `draft` (INV-8).

## Guarded by

- `preview-resolver.test.ts` — C-LR-3, C-LR-5, C-LR-6, C-LR-7 as pure-function cases.
- `staged-edits-store.test.ts` — C-LR-2 (cache-invalidation scope), C-LR-4, C-LR-9.
- `e2e/editing-perf.spec.ts` — C-LR-1, C-LR-8 latency.
- `e2e/render-stability.spec.ts` — C-LR-1 "no tree rebuild / no group collapse".
