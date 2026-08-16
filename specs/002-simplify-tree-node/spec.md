# Feature Specification: Simplify TokenTree / TreeNode Editor Coupling

**Feature Branch**: `002-simplify-tree-node`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "simplify tokentree, treenode. tokentree and treenode are too complex. they should be completely generic and not know about the details of the editors. they should only pass the data to the determined editor itself."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add a new token-type editor without touching the tree (Priority: P1)

A maintainer wants to add support for editing a new DTCG token type (for example, a future typography or shadow editor). Today, the two existing built-in types (dimension, color) are wired into the tree renderer as hard-coded special cases, so adding another built-in type risks the same pattern spreading further. The maintainer should be able to register a new editor purely as an extension and have it appear and function in the token tree, without editing the tree-rendering component at all.

**Why this priority**: This is the direct cause of the complexity the user flagged — every new type currently threatens to add another special case to the tree component. Removing this coupling is the core of the request.

**Independent Test**: Register a new token-type editor (real or a test stub) via the existing extension mechanism only, with no changes to the tree-rendering component's source. Confirm the new editor renders for tokens of that type and handles value changes and validation correctly.

**Acceptance Scenarios**:

1. **Given** a token type with no editor previously registered, **When** a developer registers an editor extension for that type, **Then** tokens of that type render using the registered editor, with no source changes required in the tree-rendering component.
2. **Given** the built-in dimension and color editors, **When** the refactor is complete, **Then** those two editors are registered through the same extension mechanism as any custom editor, rather than through dedicated code paths in the tree-rendering component.

---

### User Story 2 - Existing token editing behaves exactly as before (Priority: P1)

A user editing an existing token file with color and dimension tokens must see no change in behavior: the same swatches, inputs, validation messages, and save flow as before the refactor. This is an internal restructuring, not a behavior change.

**Why this priority**: Equal priority to Story 1 — simplifying the internals is only acceptable if nothing user-visible regresses. A simplification that breaks editing is not a success.

**Independent Test**: Run through the existing color- and dimension-token editing scenarios (view, edit, invalid-value feedback, save) and confirm every outcome matches pre-refactor behavior.

**Acceptance Scenarios**:

1. **Given** a token file containing a color token, **When** a user views and edits it in the tree, **Then** the color swatch, value input, and validation feedback behave identically to before the refactor.
2. **Given** a token file containing a dimension token, **When** a user views and edits it in the tree, **Then** the dimension input and validation feedback behave identically to before the refactor.
3. **Given** a token whose type has no registered editor, **When** a user views it in the tree, **Then** the existing generic fallback editor is shown, exactly as before the refactor.

---

### User Story 3 - Tree components are auditable as generic, editor-agnostic code (Priority: P2)

A maintainer reviewing the tree-rendering component should be able to confirm, just by reading it, that it has no knowledge of any specific token type: no imports of concrete editor packages, no type-name conditionals, and no type-specific value-handling logic. Its only job is to walk the tree, stage edits, and hand each token's data to whichever editor the registry resolves.

**Why this priority**: This is the maintainability outcome the user is asking for — lower priority than Stories 1–2 because it's a consequence of satisfying them correctly, not a separately testable behavior in itself, but it is the acceptance bar for "done."

**Independent Test**: Inspect the tree-rendering component's source and imports; confirm there are no direct references to any specific token-type package and no branching logic keyed on a specific type name.

**Acceptance Scenarios**:

1. **Given** the refactored tree-rendering component, **When** its imports are inspected, **Then** it imports no concrete token-type editor package directly (only generic registry/contract types).
2. **Given** the refactored tree-rendering component, **When** its logic is inspected, **Then** it contains no conditional branches keyed on a specific token type name (e.g. no `if (type === "color")`).

---

### Edge Cases

- What happens when a token's effective type has no registered editor (built-in or custom)? The existing generic fallback (raw value editor) must still be shown, driven by the same "no match found" path used for any unregistered type today.
- What happens when a token has no `$type` and none is inherited from an ancestor group? The tree must handle this the same way it does today (routed to the same "no matching editor" fallback path, not a special case).
- What happens when a user-defined extension registers an editor for a type name that collides with a built-in type (e.g. the user supplies their own "color" editor)? The user's registered editor must take precedence, consistent with today's extension-merge order.
- What happens when an editor's validation reports an invalid value? Error display and save-blocking must be handled generically by the tree, using only the contract's validation result — not through type-specific handling.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The tree-rendering component MUST NOT directly import any concrete token-type editor package (e.g. the color or dimension editor packages).
- **FR-002**: The built-in dimension and color editors MUST be resolved through the same generic extension-registry mechanism used for user-defined custom editors — no type-name-specific conditional branches may remain in the tree-rendering component for rendering, value-change handling, or validation.
- **FR-003**: The tree-rendering component MUST determine which editor to use for a token exclusively via the existing generic registry lookup, and MUST pass that resolved editor the token's value, contract, and change/validation callbacks in a uniform, type-agnostic way.
- **FR-004**: The refactor MUST preserve all current user-facing behavior for color and dimension tokens (rendering, value editing, validation feedback, save behavior) with no regression.
- **FR-005**: When no editor is registered for a token's effective type, the system MUST continue to fall back to the existing generic fallback editor, exactly as it does today.
- **FR-006**: The root tree container MUST remain limited to tree state management, edit staging, and save orchestration, with no editor-type-specific logic — preserving its current generic role through the refactor.
- **FR-007**: Adding a new token-type editor MUST be possible by registering it as an extension (via user config or the built-in registry) without modifying the tree-rendering or tree-container components' source.
- **FR-008**: Existing automated tests covering tree/editor behavior (color, dimension, generic editor, override, accessibility) MUST continue to pass; tests may only be updated where they assert internal implementation details that necessarily change with the refactor, never where they assert user-facing behavior.

### Key Entities

- **Tree container**: The root component that owns tree edit state, pending edits, field errors, and save orchestration. Has no knowledge of individual editor types.
- **Tree node renderer**: The recursive component that walks the token tree and, for each token, resolves and delegates to the appropriate editor via the registry — after this change, with no knowledge of any specific editor's implementation.
- **Editor registry / extension**: The existing mapping from a token type name to its editor component and options, merging built-in and user-defined entries; becomes the single path by which every editor (built-in or custom) is resolved.
- **Token type contract**: The existing per-type contract (value shape, serialization, validation, editor component) that a concrete editor package implements and registers; unchanged in shape, but now the only interface the tree ever touches.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new token-type editor can be added and made available in the tree UI with zero changes to the tree-rendering or tree-container components' source files.
- **SC-002**: 100% of existing color- and dimension-token editing scenarios (display, edit, validation, save) behave identically to before the refactor, as verified by the existing automated test suite.
- **SC-003**: The tree-rendering component contains zero direct imports of any specific token-type editor package after the refactor (down from two today: color and dimension).
- **SC-004**: The tree-rendering component contains zero conditional branches keyed on a specific token-type name after the refactor (down from two today: the dimension and color special cases).

## Assumptions

- The existing extension/registry mechanism (the type-to-editor lookup, the built-in registry, and the user-config merge logic) is sound and will be reused as the single dispatch path, not replaced.
- The built-in dimension and color editors will be re-registered as ordinary extensions rather than removed; their UI and behavior are unchanged — only how the tree invokes them changes.
- This is an internal architectural refactor: it introduces no new user-facing features and changes no editing, validation, or save semantics beyond what generic dispatch requires.
- Existing tests that assert color/dimension-specific _implementation_ details (e.g. that a specific special-case code path was hit) may need updating to reflect the generic dispatch path; tests asserting user-visible _behavior_ must continue to pass unchanged.
- Out of scope: changing the shape of the token-type contract interface, adding any new token types, or changing save/validation semantics beyond what generic dispatch requires.
