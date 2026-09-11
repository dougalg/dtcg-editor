# Feature Specification: Edit Token References

**Feature Branch**: `worktree-edit-references`

**Created**: 2026-08-29

**Status**: Implemented (2026-09-11)

**Input**: User description: "I want to be able to edit references. this means a combobox of some sort to search and filter all tokens with a preview of the other references as I search."

## Clarifications

### Session 2026-09-01

- Q: How does the user open the reference search control — always-rendered inline combobox, or a closed affordance that opens on activation? → A: Closed affordance. The reference is shown as text with an edit trigger (button / click / Enter); activating it opens a combobox popover anchored to the token row, which closes on selection or Escape.
- Q: How does the typed query match a candidate's full dotted path? → A: Case-insensitive substring match against the whole dotted path, results ordered by match position (earlier match first) then alphabetically. Fuzzy matching is a possible later enhancement, not in scope now.
- Q: What latency budget replaces "no perceptible lag" for list narrowing at 1,000+ paths? → A: Keystroke-to-updated-list under 50 ms at p95 for 1,000 paths, with no single main-thread task exceeding 50 ms (Long Task threshold), measured in-page consistent with the existing editor perf specs.
- Q: For an empty query, which ordering band comes first — same effective type or same file? → A: Same effective type first, then same file, then all remaining candidates; alphabetical by path within each band.
- Q: When is the whole-directory candidate catalogue built, and what shows if it isn't ready on activation? → A: Built server-side ahead of time (as part of the existing directory processing / reference index) and exposed via an API endpoint. The client requests it when the picker is first activated and caches it for the session; the popover shows a brief loading state while that request is in flight, and falls back to the FR-021 degradation if the request fails.
- Revision (`/speckit-specify`, 2026-09-01): A circular reference — which includes a self-reference, treated as a one-token cycle, not a separate category — cannot be selected in the picker. Such candidates get a distinct icon and a short "circular-reference" label and are marked unselectable (FR-013, FR-014, FR-016, FR-024, US3). Missing and group targets keep the warn-don't-block behaviour. This overrides the earlier "warn, don't block" assumption for the circular/self case only.
- Revision (`/speckit-tdd-run`, 2026-09-10): An empty/whitespace query no longer lists the whole directory (superseding the original FR-020). On a large catalogue that idle full listing was itself the expensive render (SC-004 — measured Long Tasks well over budget at ~2,000 candidates before this change; see `docs/research/reference-picker-search-and-virtualization.md` for why capping the render, not switching to a different filter/virtualization library, was the fix). Instead, activating the control with nothing typed shows only the current/staged target's own row (pre-selected), or nothing (prompting the user to type) when nothing currently matches; the full candidate list is reached by typing (FR-004), not by opening. This keeps FR-018's "reopening shows what's currently pointed at" working with no typing needed, while SC-002 (every path reachable) is satisfied through the search rather than the idle listing.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Repoint a reference by searching every token (Priority: P1)

A user is looking at a token whose value is a reference to another token (e.g. `{color.brand.blue}`). They have decided it should point somewhere else. Today the reference is shown but cannot be changed in the editor at all — the only way to repoint it is to hand-edit the raw file. The user wants to change the target from inside the editor by searching a list of every token in the set, picking the new one, and saving — without typing the `{...}` path by hand.

**Why this priority**: This is the entire point of the request and the smallest slice that delivers it. A searchable picker that stages a new reference value and saves it is independently useful even with only a minimal preview, and it removes the "drop to a text editor" step that exists today.

**Independent Test**: Open a token file containing a reference token, activate the reference value, search for a different token by part of its path, choose it, save, and confirm the file now holds the new reference.

**Acceptance Scenarios**:

1. **Given** a token whose entire value is a reference, **When** the user activates the reference value, **Then** a search control opens, ready to search tokens from every file in the loaded token set (showing, at most, the current target's own row — see the 2026-09-10 revision above and Edge Cases).
2. **Given** the search control is open, **When** the user types part of a token's path, **Then** the list populates with tokens whose path matches what was typed, matched across the whole dotted path (not just the leaf segment).
3. **Given** a candidate token is shown in the list, **When** the user selects it, **Then** the reference value is staged as a pending edit pointing at that token's path, and the control closes.
4. **Given** a staged reference change, **When** the user saves, **Then** the token file is written with the new reference in DTCG alias syntax and no other part of the file changes.
5. **Given** a staged reference change, **When** the user discards pending edits (or the existing unsaved-changes guard is triggered and they discard), **Then** the reference reverts to its previously saved target.
6. **Given** the search query matches no token, **When** the user looks at the list, **Then** an explicit "no tokens found" state is shown and nothing can be selected.

---

### User Story 2 - See what the new reference will resolve to before committing (Priority: P2)

As the user searches and moves through candidate tokens, they want to see the concrete value each candidate holds, and what the token being edited would then resolve to, so they can pick the right target on the first try instead of saving, checking, and correcting.

**Why this priority**: Builds directly on User Story 1 and is what makes the picker trustworthy, but repointing is already usable without it. Deferring it still leaves a shippable feature.

**Independent Test**: With the search control open, move through several candidates and confirm each one's resolved value is shown alongside it, in the same form the editor uses elsewhere (e.g. a colour swatch for a colour token), and that the resulting value of the edited token is previewed before saving.

**Acceptance Scenarios**:

1. **Given** the search control lists candidate tokens, **When** the user views or highlights a candidate that resolves to a literal value, **Then** that concrete value is shown next to it, presented the same way an equivalent literal value of that type is shown elsewhere in the editor.
2. **Given** a highlighted candidate whose own value is itself a reference (a chain), **When** the user views it, **Then** the concrete value at the end of the chain is previewed.
3. **Given** a highlighted candidate whose path is defined in more than one file or mode, **When** the user views it, **Then** each per-mode resolved value is shown and labelled by its mode, consistent with how multiply-defined references are already presented.
4. **Given** a highlighted candidate, **When** the user views the token being edited, **Then** a preview of what that token will resolve to if this candidate is chosen is shown before any save.
5. **Given** the user has selected a candidate but not yet saved, **When** they reopen the search control, **Then** the currently staged target is indicated as the current selection.

---

### User Story 3 - Cannot pick a circular reference; be warned about other broken choices (Priority: P3)

Some targets are problematic. One kind can never work: a candidate whose selection would make the token reference itself, directly or around a cycle. A self-reference is just the smallest case of this — a one-token cycle — so it is treated as a circular reference, not a separate category. The user must not be able to choose one of these at all. Other problematic targets — a path that does not exist yet, or a path that names a group — can still be chosen (the user may be pointing ahead at something they will create), but must be clearly flagged as they browse.

**Why this priority**: Robustness around the edges. The feature is usable without it, but these are exactly the mistakes a fast search-and-pick flow makes easy to make — and a circular reference is one the tool can simply refuse.

**Independent Test**: With the search control open on a token, confirm that the token's own path and any path that would close a cycle appear in the list marked as a circular reference and cannot be selected by keyboard or pointer; and that a non-existent path and a group path are flagged in the preview but remain selectable.

**Acceptance Scenarios**:

1. **Given** the token being edited is `color.accent`, **When** the user highlights `color.accent` in the list, **Then** it carries the circular-reference icon and the short label "circular-reference", and **When** the user presses Enter or clicks it, **Then** nothing is staged and the control stays open.
2. **Given** choosing a candidate would create a circular chain, **When** the user highlights that candidate, **Then** it carries the same circular-reference icon and label and the preview names the tokens in the cycle, and **When** the user attempts to select it, **Then** nothing is staged.
3. **Given** the current reference already points at a missing or group path, **When** the user opens the search control, **Then** the current (broken) reference text is still shown and editable, and the file still renders normally.
4. **Given** a candidate that resolves to a missing or group path, **When** the user highlights it, **Then** the preview flags it as missing / group, **but** the candidate remains selectable and the user can stage it.
5. **Given** a candidate that resolves cleanly next to one marked circular, **When** the user compares them, **Then** the circular one is visibly distinct as unselectable without the user having to try to select it.

---

### Edge Cases

- **Large token sets**: the loaded directory contains many hundreds or thousands of token paths — search must stay responsive and every path must remain reachable.
- **Duplicate leaf names**: two tokens share a leaf segment in different groups (`a.size` and `b.size`) — the list disambiguates them by full path and search matches the full path.
- **Broken starting point**: the token being edited currently holds a reference whose target is missing, circular, or a group — the picker still opens and lets the user repoint it.
- **Reference index unavailable**: the whole-directory catalogue cannot be built server-side (a directory-wide read problem) — the feature degrades so the user is no worse off than today; at minimum the reference remains viewable, and where possible it can still be edited as raw alias text without rich previews.
- **Catalogue still loading**: the user activates the control before the first catalogue fetch has returned — the popover opens in a loading state (not an empty state, not the unavailable degradation) and populates when the request resolves.
- **Nothing to change to**: the directory contains only the token being edited (no other candidate paths) — the list shows only that token's own entry, marked circular and unselectable, so there is effectively nothing to select.
- **Cycle only under one mode**: a multiply-defined candidate would close a cycle under one mode but resolve cleanly under another — it is treated as circular and unselectable (a reference cannot be repointed per-mode), and the preview shows which mode's chain is circular.
- **Re-selecting the current target**: selecting the token the reference already points at is a no-op and stages no edit.
- **Query with alias punctuation**: the user types braces or a leading/trailing dot — input is treated as a path fragment for matching, not as literal syntax to match character-for-character.
- **Whitespace-only or empty query** (revised 2026-09-10): the control shows only the current/staged target's own row (or nothing, prompting the user to type, if none currently matches) — not the full candidate list. The full list is reached by typing.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A token whose entire `$value` is a reference MUST show the current reference target as text alongside an edit trigger (operable by pointer and by keyboard). Activating the trigger MUST open a combobox popover, anchored to the token row, for changing the reference target; the popover MUST close on selection or on Escape, restoring focus to the trigger. The read-only reference text shown today remains the resting state.
- **FR-002**: The control MUST let the user search a list of candidate tokens drawn from every file in the currently loaded token directory, since a DTCG reference is not scoped to one file.
- **FR-003**: Candidates MUST be distinct token paths. A path defined in more than one file or mode MUST appear once, with its per-mode outcomes shown in the preview.
- **FR-004**: Typing in the control MUST narrow the list by a case-insensitive substring match of the query against each candidate's full dotted path (not only its final segment). Matches MUST be ordered by the position of the match in the path (earlier match first), then alphabetically by path. Fuzzy / non-adjacent matching is out of scope for this feature.
- **FR-005**: The control MUST be fully operable by keyboard alone — opening, searching, moving through candidates, selecting, and dismissing — and MUST meet WCAG 2.2 AA, including a programmatically determinable name for the control and screen-reader-announced results and selection.
- **FR-006**: Selecting a selectable candidate (see FR-024) MUST stage a pending edit that sets the token's value to that candidate's path in DTCG alias syntax, using the editor's existing staged-edit mechanism; it MUST NOT write the file immediately.
- **FR-007**: Saving a staged reference change MUST persist only that value change, leaving all other content of the token file (including unrelated fields, extensions, ordering, and formatting policy) intact.
- **FR-008**: Discarding pending edits MUST restore the reference to its last saved target, and the existing unsaved-changes navigation guard MUST apply to a staged reference change the same as to any other staged edit.
- **FR-009**: For each candidate the user views or highlights, the control MUST show the concrete value that candidate resolves to, presented the same way an equivalent literal value of that type is presented elsewhere in the editor (e.g. a colour swatch for a colour token), and falling back to the value's raw text form when no such presentation exists.
- **FR-010**: When a candidate resolves through a chain of references, the preview MUST show the concrete value at the end of the chain.
- **FR-011**: When a candidate's path is multiply defined, the preview MUST show one resolved outcome per mode, each labelled by its mode, consistent with how the editor already presents multiply-defined references.
- **FR-012**: For the highlighted candidate, the control MUST preview what the token being edited would itself resolve to if that candidate were chosen, before any save.
- **FR-013**: A candidate that is the token's own path MUST be treated as a circular reference (a one-token cycle), not a distinct "self-reference" category — it gets the same icon, label, and unselectable behaviour as any other circular candidate (FR-024).
- **FR-014**: The control MUST identify a candidate whose selection would create a circular reference chain — under any mode, for a multiply-defined candidate — and, in the preview, name the tokens in the cycle.
- **FR-015**: The control MUST distinguish, in the preview, a candidate that resolves cleanly from one that would be missing, circular (including the token's own path), or a group target — reusing the editor's existing reference-diagnostic vocabulary.
- **FR-016**: The control MUST NOT hard-block selecting a **missing or group** target; it MUST surface the problem in the preview and leave the decision to the user, consistent with the editor's existing graceful-degradation behaviour for broken references. It MUST block selecting a **circular** target (including the token's own path) — see FR-024 — because a circular reference can never resolve.
- **FR-017**: When the search query matches no candidate, the control MUST show an explicit empty state and MUST NOT allow a selection.
- **FR-018**: Re-opening the control after a candidate has been selected but not saved MUST indicate the staged target as the current selection — which, per FR-020's revision, MUST be visible without the user typing anything.
- **FR-019**: Selecting the token the reference already points at MUST be a no-op that stages no edit.
- **FR-020** (superseded, 2026-09-10 — see Clarifications): When an empty or whitespace-only query is present, the control MUST NOT list the whole directory. It MUST show only the current/staged target's own row (satisfying FR-018 without typing), or nothing at all when no candidate currently matches — in which case it MUST prompt the user to type. The full candidate list, in the match-position ordering FR-004 already defines, is reached only by typing. (The original ordered-bands rule — same effective type, then same file, then the rest, for the empty-query full listing — no longer has a listing to apply to and is dropped, not merely superseded in wording.)
- **FR-021**: If the whole-directory candidate catalogue cannot be built, the feature MUST degrade without breaking the page — the reference stays viewable, and where feasible editable as raw alias text — rather than blocking rendering.
- **FR-022**: This feature covers repointing tokens whose value is already a reference only. The control MUST NOT appear on a token whose value is a literal, and MUST NOT offer a way to convert a reference into a literal value — those conversions are out of scope (see Out of Scope).
- **FR-023**: The whole-directory candidate catalogue MUST be produced server-side as part of the existing directory processing / reference index, and exposed via an API endpoint. The client MUST request it on first activation of the control and cache it for the session (no rebuild per open). While that request is in flight the popover MUST show a loading state distinct from both the empty state (FR-017) and the unavailable-catalogue degradation (FR-021); if the request fails, FR-021 applies.
- **FR-024**: A candidate that would produce a circular reference (the token's own path, or any path that would close a cycle under any mode) MUST be shown in the list with a distinct icon and a short text label ("circular-reference"), MUST be visibly marked as unselectable, and MUST NOT be selectable by keyboard or pointer. Attempting to choose one MUST stage no edit and MUST leave the control open. No other diagnostic (missing, group) makes a candidate unselectable.

### Key Entities _(include if data involved)_

- **Reference (existing)**: the curly-brace pointer being edited — a target token path, the location within the token's value (whole-value only, for this feature), and the original text.
- **Candidate token path**: one distinct token path that exists somewhere in the loaded directory and could be a reference target — its path, the file(s) and mode(s) that define it, its effective type, and its resolved value(s).
- **Resolved preview**: for a given candidate and the token being edited, the concrete value that would result per mode, plus any diagnostic (missing target, circular chain — including the token's own path — group target). A circular diagnostic additionally marks the candidate unselectable.
- **Staged edit (existing)**: the not-yet-saved new reference value, carried through the editor's existing pending-edit and save flow.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can repoint a reference to any token in the loaded set from inside the editor, without hand-typing the `{...}` path and without leaving the editor for a text editor.
- **SC-002**: 100% of token paths defined anywhere in the loaded directory are reachable as candidates through the control's search.
- **SC-003**: The resolved value that a candidate would produce for the edited token is visible before the user saves, so no save-then-check-then-correct round trip is needed to verify a choice.
- **SC-004**: For a token set of at least 1,000 candidate paths, keystroke-to-updated-list latency stays under 50 ms at the 95th percentile, and no single main-thread task triggered by typing exceeds 50 ms (the Long Task threshold), measured in-page in line with the editor's existing performance specs.
- **SC-005**: In usability testing, users correctly identify whether their chosen target will resolve (versus being missing or a group) at least 90% of the time before saving; circular targets do not depend on user judgement because they cannot be selected.
- **SC-006**: The entire flow — open, search, choose, confirm — is completable using only the keyboard, and the control passes automated WCAG 2.2 AA checks with zero violations.
- **SC-007**: Repointing a reference and saving changes only that token's value on disk; a parse/serialize round-trip of the file shows no other differences.
- **SC-008**: No repoint made through the control can produce a token that references itself directly or around a cycle — circular candidates (including the token's own path) are never selectable, so a circular reference cannot be saved via this feature.

## Assumptions

- **Whole-value references only**: this feature covers tokens whose entire `$value` is a reference. References nested inside composite values (a shadow's colour sub-field, typography sub-fields, gradient stops, etc.) are out of scope — those composite token types have no editor yet and are tracked separately on the backlog.
- **Directory-wide candidates**: the picker lists token paths from every file in the currently loaded token directory, because a DTCG reference is not file-scoped. The reference itself continues to name only a path; which file/mode wins is decided by the existing resolution logic.
- **Reuses existing resolution machinery**: resolved values, chains, per-mode outcomes, and the missing/circular/group diagnostics all come from the reference-preview capability already in the editor (feature 007). Detecting that a *prospective* pick would be circular reuses that same chain/cycle detection against the proposed edit. This feature adds the editing control and the whole-directory candidate catalogue, not new resolution semantics.
- **Reuses existing edit/save flow**: selecting a target stages an ordinary pending edit; persistence, the Save action, and the unsaved-changes navigation guard are unchanged.
- **A self-reference is a circular reference**: the token's own path is the smallest cycle (one hop). It is not modelled or presented as a separate "self-reference" category — one icon, one "circular-reference" label, one unselectable behaviour covers both.
- **Block circular, warn on the rest**: a circular pick (including the token's own path) is prevented — it can never resolve. A missing or group pick is surfaced in the preview but still allowed, matching the editor's existing stance that broken references are shown rather than made impossible, and allowing a user to point ahead at a path they intend to create.
- **Circular is all-or-nothing across modes**: because a reference names one path (not one per mode), a candidate that is circular under any mode is unselectable outright; per-mode missing/group diagnostics remain informational.
- **Reference repair is separate**: the backlog item "repair circular, group-reference, or unresolved token references" remains its own feature; this one is about repointing, and only incidentally lets a user fix a broken reference by choosing a valid target.
- **Design-system sourced UI**: the search control is built from the shared design system's components and design tokens, per the project constitution, rather than a bespoke widget.

## Out of Scope

- Converting a literal-valued token into a reference, or a reference back into a literal value (confirmed: repoint-only). If wanted, this is a separate follow-up.
- Editing references nested inside composite values (shadow, typography, gradient, border, transition sub-fields) — only tokens whose entire `$value` is a reference are covered.
- Repairing broken references as a dedicated flow (circular / group-target / unresolved) — tracked as its own backlog item; this feature only incidentally lets a user fix one by choosing a valid target.
- Bulk operations (repointing many references at once, find-and-replace across a target path).
- Editing the resolver file / mode definitions themselves.
