# Feature: Configured Token Directory Viewer

## Summary
The web app is configured, at startup, with a target directory on disk via a config file. A Node.js backend (built into a Next.js app) recursively scans that directory for `*.json` files, parses each one as a DTCG token file using `token-core`'s `parseTokenFile`, and the frontend displays the discovered files and lets the user browse each valid file as a navigable tree of tokens (name, `$type`, `$value`). This is the first end-to-end feature for the web app and establishes the initial Next.js app structure and a minimal `token-core` parsing package.

## User Stories
- As a design system maintainer, I want to point the editor at my tokens folder via a config file so that I don't need to re-select or upload files every session.
- As a design system maintainer, I want to see every DTCG token file in my folder, including ones nested in subfolders, so I can find and inspect tokens without leaving the app.
- As a design system maintainer, I want to see a token's name, `$type`, and `$value` in a tree view, so I can quickly check what's defined without opening raw JSON.
- As a design system maintainer, I want a malformed or invalid token file to be flagged clearly instead of crashing the app, so one bad file doesn't block me from viewing everything else in the folder.

## Functional Requirements

### FR-01: Configurable Target Directory
On startup, the app reads the path to the token directory from a config file (e.g. `dtcg-editor.config.json`) located at the project/working directory root. The config file's shape is validated with a Zod schema at load time (an external edge, per this repo's validation-at-the-edges convention).

### FR-02: Recursive Directory Scan
The backend recursively walks the configured directory, including all subfolders, and collects every `*.json` file found at any depth as a candidate token file.

### FR-03: Token File Parsing
Each candidate file's contents are read via Node's `fs` APIs and parsed through `token-core`'s `parseTokenFile` (Zod-backed). Files that fail parsing/validation are not thrown away or allowed to crash the scan — they are recorded with an error reason and surfaced individually.

### FR-04: Folder Overview
The UI shows a list of all discovered candidate files (with their path relative to the configured root), each marked as valid or invalid. Invalid files show their error reason inline; valid files are selectable.

### FR-05: Token Tree View
Selecting a valid file shows a navigable tree of its tokens: token name (including group/nesting path), `$type`, and `$value`. This is a raw/generic rendering — no token-type-specific UI (e.g. color swatches) is part of this feature.

### FR-06: Read-Only in This Feature
The backend Route Handlers built for this feature only read files. No endpoint modifies file content. (The underlying Node backend is capable of read/write access in principle, but write/edit functionality is explicitly not implemented or exposed here.)

## Acceptance Criteria
- [ ] AC-01: If the config file is missing, unreadable, or its directory field fails Zod validation, the app fails to start and prints a clear error identifying the problem (missing file, invalid path, schema violation) rather than starting in a broken state.
- [ ] AC-02: Given a configured directory containing `*.json` files at multiple nesting depths, every one of them is discovered by the scan.
- [ ] AC-03: Each discovered file is parsed with `parseTokenFile`; valid files render as a token tree (name, `$type`, `$value`) and invalid files show a per-file error without affecting the display of any other file.
- [ ] AC-04: The folder overview lists every discovered file (valid and invalid) with its relative path, and selecting a valid file opens its token tree.
- [ ] AC-05: No route, handler, or UI action in this feature writes to or modifies any file in the configured directory.
- [ ] AC-06: The app runs as a standalone Next.js app (`next build` / `next start`) reading the config file from its working directory at boot.

## Technical Scope

### Affected Modules
- **New:** `token-core` package (or minimal subset of it) — owns `parseTokenFile` and the `TokenDocument`/generic `TokenValue` Zod schema needed to parse a token file into a typed tree. Full per-spec-type validation for every DTCG token type is not required for this feature — only enough structure to expose `$type`/`$value`/nesting generically.
- **New:** web app rebuilt as a Next.js (App Router) app — this is the first real code in the previously-bare `web-app` package.
- **Not touched:** `token-type-contract` and individual token-type packages (`color`, `dimension`, etc.) — out of scope; this feature only needs generic tree rendering, not per-type rendering.

### New Components Required
- `dtcg-editor.config.json` schema + Zod validator, loaded server-side at startup.
- Route Handler(s) under `app/api/...` that recursively scan the configured directory and return, per file: relative path, valid/invalid status, and (for valid files) the parsed token tree or (for invalid files) an error message.
- Frontend: folder overview list component (file list with valid/invalid state) and token tree view component.

### Integration Points
- Node's `fs`/`fs/promises` APIs for recursive directory traversal and file reads (server-side only, inside Route Handlers).
- `token-core`'s `parseTokenFile` as the sanctioned entry point for turning raw file contents into a typed `TokenDocument` — this file read is the validation edge per this repo's conventions.

## Non-Functional Requirements
- **Performance:** The directory scan and parse run on-demand per request in this initial version; no caching or file-watching is required yet. Acceptable for the expected scale (a single local design-system token folder, not a large arbitrary filesystem tree).
- **Security:** The configured directory path comes from the config file at startup, not from user/runtime input, so there is no user-facing path-traversal surface in this feature. If a future feature adds a file-path query/route parameter, it must canonicalize and confirm the resolved path stays within the configured root before reading.
- **Scalability:** Not a concern at this stage — single local folder, single user, no concurrent-access requirements.

## Out of Scope
- Editing or writing token values (future feature).
- Cross-file alias/`$ref` resolution between token files.
- Token-type-specific rendering (color swatches, dimension previews, etc.) — depends on `token-type-contract`, which is a separate future feature.
- Live file-watching / auto-refresh when files change on disk after the app has started.
- Authentication/authorization (single local user is assumed).
- An in-app UI to change the configured directory — the directory is set via the config file, edited outside the app.
- Any browser-only folder access (e.g. File System Access API) — explicitly rejected in favor of the Node backend approach.

## Open Questions
- Exact config file field name(s) and whether it allows any settings beyond the directory path — to be finalized in `plan.md`.
- Whether "all `*.json` files" should be used as-is (current decision) or whether a future refinement should sniff/filter to reduce noise from non-token JSON files (e.g. a stray `package.json`) accidentally present in the configured directory — currently such files are expected to simply show up as "invalid" in the folder overview.
- Whether the config file's location is always the process's working directory, or should be overridable (e.g. via an env var pointing at a config file path) — assumed to be the working directory root for this feature; confirm in `plan.md`.
