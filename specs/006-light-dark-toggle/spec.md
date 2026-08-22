# Feature Specification: Light/Dark Mode Switcher

**Feature Branch**: `worktree-light-dark-switcher`

**Created**: 2026-08-22

**Status**: Implemented (2026-08-22)

**Input**: User description: "Add a light/dark mode switcher following the two-state toggle approach from Lea Verou's 'Dark mode toggles: theory and practice' (https://lea.verou.me/blog/2026/dark-mode-toggles/) — a compact two-state (light/dark) button that internally tracks three states (system default / light override / dark override): first click sets an explicit override to the opposite of the currently visible theme, second click clears the override back to system default; store the override in localStorage, respect prefers-color-scheme when unset, and only evaluate/clear overrides on user interaction (never react proactively to OS theme changes)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Follow system appearance by default (Priority: P1)

A user opens the editor for the first time (or with no saved preference) and the interface automatically matches their operating system's light/dark setting, with no extra step required.

**Why this priority**: This is the default state for every user and must work correctly before any override behavior matters — most visitors will never touch the toggle.

**Independent Test**: With no stored preference, set the OS/browser to dark, load the app, and confirm it renders in dark appearance; repeat with the OS set to light and confirm it renders in light appearance.

**Acceptance Scenarios**:

1. **Given** no theme preference has been saved, **When** the user's operating system is set to dark, **Then** the editor renders in dark appearance on load.
2. **Given** no theme preference has been saved, **When** the user's operating system is set to light, **Then** the editor renders in light appearance on load.

---

### User Story 2 - Manually override the theme (Priority: P1)

A user finds the current appearance uncomfortable (e.g. too bright in a dark room, or too dark to read outdoors) and wants to switch it immediately, regardless of what their OS is set to.

**Why this priority**: This is the core value of the feature — solving the user's immediate visual comfort problem — and is equally critical to the default behavior.

**Independent Test**: With the editor showing either appearance, activate the toggle once and confirm the interface immediately switches to the opposite appearance and stays there even if the page is reloaded.

**Acceptance Scenarios**:

1. **Given** the editor is currently showing light appearance (whether from system default or a saved preference), **When** the user activates the toggle, **Then** the editor immediately switches to dark appearance.
2. **Given** the editor is currently showing dark appearance, **When** the user activates the toggle, **Then** the editor immediately switches to light appearance.
3. **Given** the user has set an override, **When** the user reloads the page or returns in a new session, **Then** the editor still shows the overridden appearance rather than reverting to system default.

---

### User Story 3 - Return to following system appearance (Priority: P2)

A user who previously overrode the theme decides they want the interface to go back to automatically following their OS setting again.

**Why this priority**: Important for user control and for correctness of the toggle's three-state model, but only relevant to users who have already exercised User Story 2 — a smaller population than the first two stories.

**Independent Test**: With an override active, activate the toggle a second time in the direction that returns to the current system appearance, then confirm changing the OS setting afterward changes the editor's appearance again.

**Acceptance Scenarios**:

1. **Given** the user has an active override matching the opposite of system appearance, **When** the user activates the toggle again, **Then** the override is cleared and the editor shows system-default appearance.
2. **Given** the override has just been cleared this way, **When** the user's operating system appearance changes afterward, **Then** the editor's appearance updates to follow it.

---

### Edge Cases

- What happens if the user's browser doesn't report an OS-level light/dark preference at all? System default MUST be treated as light appearance in that case.
- What happens if the user changes their OS appearance setting while the editor is already open and no override is active? The editor's appearance MUST update to match, without requiring a reload (per FR-006 — reacting to live OS changes is distinct from the toggle's own override logic, which must not react to OS changes on its own).
- What happens if the user changes their OS appearance setting while an override is active? The override MUST remain in effect and the appearance MUST NOT change until the user interacts with the toggle again.
- What happens if the stored preference is corrupted, missing, or blocked (e.g. localStorage disabled or unavailable)? The editor MUST fall back to system-default appearance without erroring.
- What happens across multiple open tabs/windows of the app? Each MUST reflect the same stored override once set, consistent with how the storage mechanism naturally synchronizes across tabs.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The editor MUST support two visible appearances: a light appearance and a dark appearance.
- **FR-002**: The editor MUST provide a single, always-visible toggle control that lets the user switch the current appearance.
- **FR-003**: When no explicit user preference has been saved, the editor MUST render using the appearance matching the user's operating system setting (defaulting to light appearance if the OS reports no preference).
- **FR-004**: Activating the toggle MUST set an explicit saved preference for the appearance opposite the one currently displayed.
- **FR-005**: If an explicit saved preference is already active and equals the opposite of the current system appearance, activating the toggle again MUST clear the saved preference and return the editor to following system appearance.
- **FR-006**: While no explicit saved preference is active, the editor MUST update its appearance automatically if the user's OS-level appearance setting changes, without requiring the user to reload or interact with the toggle.
- **FR-007**: While an explicit saved preference is active, the editor's appearance MUST NOT change on its own in response to OS-level appearance changes — only user interaction with the toggle may change it.
- **FR-008**: A saved explicit preference MUST persist across page reloads and future sessions on the same browser.
- **FR-009**: The toggle control MUST be operable via keyboard and MUST expose its current state and purpose to assistive technology (e.g. announcing whether activating it will switch to light or dark appearance).
- **FR-010**: The toggle MUST always present exactly two choices to the user (switch to light / switch to dark) — it MUST NOT expose a separate third "system default" option as a distinct visible choice.
- **FR-011**: If reading or writing the saved preference fails or is unavailable, the editor MUST continue to function using system-default appearance rather than failing to load.

### Key Entities

- **Theme Preference**: The user's saved appearance choice, if any. Either absent (follow system) or an explicit value of "light" or "dark". Persists per-browser across sessions.
- **Effective Appearance**: The appearance actually shown at any moment — derived from Theme Preference when present, otherwise from the current OS-level appearance setting.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user with no saved preference sees the editor's appearance match their OS setting on first load, 100% of the time.
- **SC-002**: A user can switch the editor's appearance in a single interaction with the toggle, with the visual change taking effect in under 100ms.
- **SC-003**: A user's manually chosen appearance remains in effect across at least 30 days of intermittent use without needing to be re-selected, as long as browser storage for the site is not cleared.
- **SC-004**: A user who wants to return to automatic appearance can do so in a single additional interaction with the same toggle, without visiting a separate settings screen.
- **SC-005**: The toggle's current state and effect are correctly announced by screen readers, verified via automated accessibility testing with zero critical violations.

## Assumptions

- "System appearance" refers to the OS/browser-level light-vs-dark preference exposed to web pages (commonly surfaced via a `prefers-color-scheme`-style media feature); no in-app "system" setting screen is required since the three-state model is fully expressed through the two-state toggle per Lea Verou's approach.
- The saved preference is stored per-browser (client-side), not synced to a user account or server — this app does not currently have a concept of user accounts to attach the preference to.
- Only two appearances (light and dark) are in scope; no additional themes (e.g. high-contrast, custom accent colors) are part of this feature.
- The toggle is a single global control affecting the whole editor, not a per-page or per-panel setting.
- Existing UI colors and components are assumed to already have or will separately receive dark-appearance-compatible styling; this spec covers the switching mechanism and control itself, not an exhaustive audit of every component's dark styling.
