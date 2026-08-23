# Feature Specification: Token Reference Preview & Navigation

**Feature Branch**: `worktree-token-reference-links`

**Created**: 2026-08-22

**Status**: Implemented (2026-08-23)

**Input**: User description: "references to other tokens should (1) show the value that is referenced; (2) the reference name should be a link that takes the user to the referenced token to edit it if desired; (3) a token with references should have a 'referenced {once,twice,N times}' item which contains a dropdown list that shows a list of all tokens referencing this token, and they should be links back to them"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See what a reference actually resolves to (Priority: P1)

A user browsing a token file sees a token whose value points at another token (e.g. `{color.neutral.900}`). Today that tells them only the *name* of the target, never the actual value — and for some tokens the editor goes further and wrongly reports the reference as broken. The user wants to see the real, concrete value, and wants a valid reference to stop being flagged as an error.

**Why this priority**: The most common encounter with a reference and the one that costs the most today. It is also the only story that corrects existing incorrect behavior rather than adding new capability, and it is independently useful with no navigation or whole-directory indexing needed.

**Independent Test**: Open a token file containing a reference and confirm the concrete value it resolves to is shown, and that no error is reported for it, without navigating away.

**Acceptance Scenarios**:

1. **Given** a token whose entire value is a reference to a token with a literal value, **When** the user views that token, **Then** both the reference itself and the concrete value it resolves to are shown.
2. **Given** a token currently reported as having an invalid value solely because that value is a reference, **When** the user views it after this feature, **Then** no validation error is reported for it and its resolved value is shown instead.
3. **Given** a token whose value is a reference to another reference (a chain), **When** the user views that token, **Then** the concrete literal value at the end of the chain is shown.
4. **Given** a composite token (e.g. a shadow) with a reference nested inside one of its sub-values, **When** the user views that token, **Then** that nested reference also shows the value it resolves to.
5. **Given** a reference whose target does not exist, **When** the user views that token, **Then** a warning naming the missing path is shown, and the rest of the file still renders normally.
6. **Given** a reference whose chain is circular, **When** the user views that token, **Then** a warning naming the tokens forming the cycle is shown, and the page remains usable.
7. **Given** a reference whose target is a group rather than a token, **When** the user views that token, **Then** a warning naming the group path is shown, distinct from the missing-target warning.

---

### User Story 2 - Jump to a referenced token to edit it (Priority: P2)

A user looking at a token that references another decides the *referenced* token is the one they actually need to change. They want to get to it directly instead of working out which file it lives in and scrolling to find it.

**Why this priority**: Builds on the same resolution capability as User Story 1 and delivers the natural follow-on action, but the preview alone is already independently valuable — reading a value is useful even without being able to jump to it.

**Independent Test**: With a token referencing another token, activate the reference and confirm the referenced token is brought into view ready to edit — including when it lives in a different file.

**Acceptance Scenarios**:

1. **Given** a token referencing another token in the same file, **When** the user activates the reference, **Then** the referenced token is brought into view and can be edited.
2. **Given** a token referencing a token in a different file, **When** the user activates the reference, **Then** the user is taken to that file with the referenced token brought into view.
3. **Given** a referenced token nested inside collapsed groups, **When** the user arrives at it via a reference, **Then** its containing groups are opened so it is actually visible.
4. **Given** a reference whose target path is defined in more than one file, **When** the user activates it, **Then** they are offered each definition — identified by file and by the mode it applies to — and choose which to open.
5. **Given** a reference whose target does not exist, **When** the user views it, **Then** it is not offered as something to activate.
6. **Given** the user has arrived at a token via a reference, **When** they look at the page, **Then** it is apparent which token they were sent to.
7. **Given** the user has unsaved edits, **When** they activate a reference that would leave the current file, **Then** they are warned and can save, discard, or stay.

---

### User Story 3 - Discover what depends on a token before changing it (Priority: P3)

A user about to edit a token wants to know what else will be affected — which other tokens reference it — and to be able to inspect any of them.

**Why this priority**: The highest-effort story, because it requires knowing every reference across the whole token set rather than only what is on screen. It is also the least frequently needed of the three — relevant at the moment of editing, whereas User Story 1 matters on every view.

**Independent Test**: Open a token that other tokens reference and confirm it reports how many reference it and can list them, each reachable.

**Acceptance Scenarios**:

1. **Given** a token referenced by exactly one other token, **When** the user views it, **Then** it shows "referenced once".
2. **Given** a token referenced by exactly two other tokens, **When** the user views it, **Then** it shows "referenced twice".
3. **Given** a token referenced by three or more other tokens, **When** the user views it, **Then** it shows "referenced N times" with N being the actual count.
4. **Given** a token showing a reference count, **When** the user expands it, **Then** every referencing token is listed, and each can be activated to reach that referencing token.
5. **Given** a token that no other token references, **When** the user views it, **Then** no reference-count indicator is shown at all.
6. **Given** a token referenced from other files, **When** the user expands the list, **Then** those referencing tokens are included and it is apparent which file each lives in.

---

### Edge Cases

- **Unresolvable reference** (target does not exist in scope): the token MUST be clearly marked as unresolvable rather than showing a blank, a raw placeholder, or an error page. The rest of the file must remain viewable.
- **Circular reference** (a chain returning to a token already in that chain): because chains are followed to their end, this MUST be detected rather than pursued indefinitely — the affected values are reported as unknown, a warning is surfaced, and the app must not hang, overflow, or crash. No cycle exists in this project's own token set, so this can only be covered by a purpose-built fixture.
- **Reference pointing at a group rather than a token**: invalid per the DTCG format spec (references may only target complete tokens) and MUST be treated as unresolvable, not silently rendered.
- **Reference into a file that fails to parse**: its targets are unresolvable, and one bad file MUST NOT stop references between the remaining files from resolving.
- **The same token referencing the same target twice** (e.g. two layers of one shadow token referencing one color): the target counts that referencing token **once**, so its list contains no duplicate entries.
- **A token that both holds a reference and is itself referenced**: the resolved-value preview and the reference-count indicator both appear.
- **A token path defined in more than one file**: not hypothetical — this affects 75 of the 490 token paths in this project's own token set, where `dark.json` overrides `colors.json`. See FR-005.
- **A chain passing through a multiply-defined path**: resolution is performed per mode (see FR-005), so a chain yields one outcome per mode rather than branching at every hop.
- **A token with many referencing tokens**: the list must stay readable and navigable. The busiest token in this project's own set has 8 referencing tokens, but behavior must not degrade past that.

## Requirements _(mandatory)_

### Functional Requirements

#### Reference detection and resolution

- **FR-001**: The system MUST recognize a token value that references another token, in both forms the DTCG format allows — as a token's entire value, and nested inside a composite token's sub-values.
- **FR-002**: The system MUST resolve a reference by following it through every further reference in the chain until it reaches a literal value, per the DTCG format spec's requirement that tools follow each reference until they find a token with an explicit value.
- **FR-003**: The system MUST retain the complete ordered chain of tokens traversed during resolution — every intermediate token, not only the final literal value — so the full resolution path is available for display and for future visualization of reference relationships.
- **FR-004**: The system MUST resolve references against every token file in the user's configured token directory, not only the file currently being viewed.
- **FR-005**: When a referenced token path is defined in more than one file, the system MUST resolve it once per mode defined by the token set, and MUST label each resolved outcome with the mode and file it came from. Where the token set defines no modes, each definition is identified by its file alone. The system MUST NOT silently pick one definition and discard the others.
- **FR-006**: The system MUST detect a circular reference chain, report the affected tokens' values as unknown, and surface a warning **to the end user** naming the tokens that form the cycle, without hanging, overflowing, or crashing.
- **FR-007**: The system MUST treat a reference whose target does not exist, or whose target is a group rather than a token, as unresolvable.

#### Showing the referenced value (User Story 1)

- **FR-008**: For every resolvable reference, the system MUST display the concrete value it resolves to, in addition to the reference itself.
- **FR-009**: A token whose value is a valid reference MUST NOT be reported as having an invalid value. This corrects existing behavior in which such tokens are flagged as errors — for example a color token holding a reference is currently told its value "must be a 6-digit hex string".
- **FR-010**: A resolved value MUST be presented the same way an equivalent literal value of that type is presented, so a referenced color is as recognizable as a directly-specified one.
- **FR-011**: For a reference that does not resolve, the system MUST show a warning to the end user in place of a resolved value.
- **FR-011a**: That warning MUST be **distinct for each of the three failure cases** — target does not exist, target is a group, and circular chain — rather than one shared "cannot be resolved" message. Each case is a different authoring mistake with a different remedy, so a single message would tell the user their reference is broken without telling them how.
- **FR-011b**: Each warning MUST identify the offending path from that case's own diagnostic detail: the missing path, the group path, or the tokens forming the cycle.

#### Navigating to the referenced token (User Story 2)

- **FR-012**: The system MUST let the user activate a resolvable reference to reach the token it points at.
- **FR-013**: When the referenced path has more than one definition, activating the reference MUST offer the user a list of those definitions — each identified by its file and the mode it applies to — and let them choose which one to open.
- **FR-014**: Reaching a referenced token MUST bring it into view and give it focus — opening any groups containing it, scrolling it into view, and making clear which token was navigated to. This requirement covers **visibility and focus only**. It does not promise the destination's value is editable: a destination that itself holds a reference has no value editor, per this feature's read-only-with-respect-to-reference-authoring scope. That is a routine case rather than a corner one — this project's own token set contains 47 chained references, so any hop to a chain intermediate lands on such a token. The destination's name and description remain editable as for any token.
- **FR-015**: Navigation MUST work when the referenced token is in a different file from the referencing token.
- **FR-016**: A reference that does not resolve — for any of the three failure cases — MUST NOT be offered as an activatable navigation control. Its warning is displayed instead, and the warning itself is not a link.
- **FR-017**: Every navigation control this feature introduces MUST be operable by keyboard and expose an accessible name describing where it leads.
- **FR-018**: If the user has unsaved edits and activates a control that would leave the current file, the system MUST warn them and let them save the edits, discard them, or remain where they are. Edits MUST NOT be discarded or written to disk without the user choosing.

#### Reference count and referencing-token list (User Story 3)

- **FR-019**: The system MUST determine, for a given token, the set of distinct other tokens that reference it directly, counting a token that references it more than once only once.
- **FR-020**: When at least one other token references a token, the system MUST show a reference-count indicator reading "referenced once" for one, "referenced twice" for two, and "referenced N times" for three or more.
- **FR-021**: When no other token references a token, the system MUST NOT show a reference-count indicator.
- **FR-022**: The reference-count indicator MUST be expandable to reveal a list of every referencing token, and collapsible again.
- **FR-023**: Each entry in that list MUST be activatable to reach the referencing token, and MUST identify which file that token lives in when it is not the file being viewed.
- **FR-024**: The reference count and its list MUST account for referencing tokens in every file in the configured token directory, not only the file being viewed.

### Key Entities

- **Token Reference**: a pointer from one token to another, identified by the target token's dot-separated path. Occurs either as a token's whole value or nested inside a composite value. May point at a token that is itself a reference.
- **Resolution Chain**: the ordered sequence of tokens traversed from a reference to the literal value at its end — each step identified by its token path and containing file. Retained in full rather than collapsed to its endpoint, so reference relationships can be displayed and later visualized. Ends in a literal value, an unresolvable target, or a detected cycle.
- **Resolved Value**: the literal value at the end of a Resolution Chain. Undefined for an unresolvable or circular reference. A path defined in several modes has one resolved value per mode.
- **Referencing-Token Set**: for a given token, the distinct set of other tokens that reference it directly, each identified by its own path and containing file.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every resolvable reference displays its resolved value, verified against this project's own token set — 228 references across 16 files, of which 191 point at a token in a different file.
- **SC-002**: Chained references resolve to a literal value rather than to another reference, verified against the 47 chained references in that same token set, whose longest chain is 3 hops.
- **SC-003**: No token is reported as having an invalid value solely because that value is a valid reference — verified across the same token set, which currently produces such false errors.
- **SC-004**: A user can get from a reference to the token it points at in a single interaction, without needing to know which file the target is in.
- **SC-005**: For a path defined in several files, the user can see every definition and choose between them, with no definition silently hidden — verified against the 75 such paths in this project's own token set.
- **SC-006**: A user can determine how many tokens depend on a given token, and reach any one of them, without searching or reading files by hand.
- **SC-007**: Unresolvable, group-targeted, and circular references never prevent a file from being viewed and never produce an unhandled failure.
- **SC-008**: Unsaved edits are never lost or silently written when following a reference out of the current file.
- **SC-009**: All controls this feature adds are fully keyboard-operable and pass automated accessibility checking with zero critical violations.
- **SC-010**: Building the reference index takes **under 50 ms for 5,000 tokens whose reference chains reach a depth of 5**, measured with the same parser the app uses in production. This is the enforceable gate behind "opening a token file stays responsive". The budget is deliberately set against a synthetic set roughly an order of magnitude larger than this project's own 565 tokens, so it constrains growth rather than merely restating today's measurement. Depth 5 is a property of the benchmark fixture only — it is **not** a cap on how deep the resolver will follow a chain, which is unbounded by design and terminated by cycle detection (FR-002, FR-006).
- **SC-011**: A user encountering any of the three failure cases can tell from the warning alone which of the three it is and which path is at fault, without opening another file or reading the raw JSON.

## Assumptions

- **Resolution scope is the configured token directory.** The DTCG format spec describes references resolving within a document but does not define cross-file behavior. This project's own token set settles it empirically: 191 of its 228 references target a token defined in a different file, and its DTCG resolver file composes 16 separate files into one document. A file-local interpretation would leave 84% of real references unresolvable.
- **Mode information comes from the token set's own resolver definition**, which is what makes a definition attributable to "light" or "dark". No global mode selector is added to the interface — modes are used to label the alternatives a user is offered, not to switch what the whole application displays.
- **This feature is read-only with respect to reference *authoring*.** It covers displaying, navigating, and counting references, and correcting the false "invalid value" reporting in FR-009. Creating a reference, converting a literal value into a reference, or editing the reference path itself remain out of scope — consistent with the request, which locates editing on the *target* token ("takes the user to the referenced token to edit it if desired").
- **The reference count counts distinct direct referencing tokens.** A token referencing the same target twice contributes one entry, because the list is a navigation aid and a duplicated link is noise. Tokens that reach a target only through an intermediate token are not counted as referencing it directly.
- **Both the reference and its resolved value are worth showing.** The reference is the token's actual authored content and its identity; the resolved value is the information the user currently lacks. Showing only one would either hide what the file really says or leave the present problem in place.
- **Reference counts, chains, and lists are derived, never stored**, so they cannot drift from the files' real contents.
- **Only the DTCG curly-brace reference syntax is in scope**; other tools' alias conventions are not.
- **New test fixtures will be required.** No existing fixture in this project contains a reference of any kind, and its own token set contains no broken, group-targeted, or circular reference — so those failure cases can only be covered by purpose-built fixtures, including at least one cross-file pair.
- **A way to address an individual token is a prerequisite.** No means of pointing at a single token — within a file or across files — exists today; the finest addressable unit is a whole file. Establishing one is part of delivering User Stories 2 and 3.
- **Retaining the full resolution chain is groundwork, not a visible feature in itself.** FR-003 requires the intermediate steps be kept so relationships can be visualized later; designing that visualization is not part of this feature.
- **Broken references are reported, not repairable in-app.** FR-011a gives each of the three failure cases its own warning so the user can see precisely what is wrong and fix it in the file. Offering an in-app remedy — a suggested correction, a picker to re-point the reference, a "create the missing token" action — is deliberately deferred. This follows from the feature already being read-only with respect to reference authoring: a token holding a reference has no value editor either way, which is not a regression, since such a token is read-only today via the invalid-value path.
- **The three warning cases are distinguished by cause, not by root cause.** A reference into a file that fails to parse surfaces as "target does not exist", because from the index's point of view the file contributed no tokens. The user is therefore told the target is missing when the real cause is a broken file elsewhere. Accepted for now as a known rough edge; distinguishing it would require the index to track which files failed to load and is out of scope here.
