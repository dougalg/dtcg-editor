# Implementation Plan: Light/Dark Mode Switcher

**Branch**: `worktree-light-dark-switcher` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-light-dark-toggle/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a compact, always-visible two-state light/dark toggle to the web app, following Lea Verou's two-state-button model (the visible control only ever offers "switch to light" / "switch to dark," but internally tracks three states — system default, explicit light, explicit dark). The dark color values already exist in `packages/design-system`'s token pipeline (`dark.json`, wired to `@media (prefers-color-scheme: dark)`); this feature adds two attribute-selector permutations (`[data-theme="dark"]` / `[data-theme="light"]`) so a manual override can win over the OS setting, a `useTheme` hook driving a `data-theme` attribute on `<html>` (with an inline FOUC-prevention script), and a `ThemeToggle` component built on the existing `Switch` primitive with sun/moon icons matching the provided reference screenshots (pill switch, thumb-embedded icon, native-tooltip hover affordance). The two new icons are vendored as Lucide SVGs and delivered via a **generalized** version of the existing icon-sprite generator, reworked from one hardcoded icon list into a folder scanner (`assets/icons/<sprite-name>/*.svg` → `public/<sprite-name>-sprite.svg` + a generated id-mapping file), so future icon sets need zero script changes.

## Technical Context

**Language/Version**: TypeScript (strict, per root `tsconfig.base.json`)

**Primary Dependencies**: React 19 / Next.js 16 (`apps/web-app`), `@radix-ui/react-switch` (already a dependency, via `packages/design-system`'s `Switch`), `zod`, `neverthrow` — all already-approved dependencies; no new dependency added.

**Storage**: `localStorage` (client-side only, per spec Assumptions) — key `dtcg-ed-theme-preference`.

**Testing**: Vitest + `@testing-library/react` (unit, `apps/web-app`); Vitest Browser Mode + `axe-core` (component-level a11y); `@playwright/test` (whole-page + keyboard-only flow) — this repo's existing two-tier a11y setup, applied to `ThemeToggle`.

**Target Platform**: Web (Next.js App Router, `apps/web-app`), all evergreen browsers.

**Project Type**: Web application (existing monorepo: `apps/web-app` + `packages/*`).

**Performance Goals**: Theme switch visually complete in <100ms (SC-002) — pure CSS custom-property re-scope via the `data-theme` attribute, no re-render of token-heavy views required.

**Constraints**: No flash of incorrect theme on first paint (FOUC) despite the app being SSR'd (Next.js) with no server-side knowledge of the client's stored preference or OS setting.

**Scale/Scope**: One global toggle control; two color appearances; two new vendored icons; a build-tooling generalization touching one existing script and its 14 existing icon inputs (moved, not changed).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status | Notes                                                                                                                                                                                                 |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. DTCG Spec Compliance                     | N/A    | No DTCG token schema/format touched — `dark.json` already exists and is unmodified by this feature.                                                                                                    |
| II. Feature-Based Code Organization         | Pass   | `ThemeToggle` owns its own component folder; `useTheme` lives in `apps/web-app/hooks/`; sprite generation stays a `apps/web-app/scripts/` build tool.                                                   |
| III. TypeScript Strictness                  | Pass   | All new code under the existing strict root `tsconfig.base.json`; no `any`.                                                                                                                            |
| IV. Validation at the Edges                 | Pass   | The `localStorage` read is the edge; parsed via `z.enum(["light","dark"]).optional()` before being trusted (research.md §5).                                                                          |
| V. Result-Pattern Error Handling            | Pass   | `localStorage` access wrapped once via `fromThrowable` at its call site inside `useTheme`'s injected defaults (research.md §6); no bare `try/catch`.                                                    |
| VI. Dependency Injection for I/O            | Pass   | `getStoredTheme`/`setStoredTheme`/`matchMedia` are injected params with real defaults, inline (no new adapter module — single call site), matching the existing `useSaveTokenEdits` convention.       |
| VII. Token-Editor Package Contract          | N/A    | No token-type editor package touched.                                                                                                                                                                   |
| VIII. Minimal Dependencies                  | Pass   | No new dependency: `Switch` and all Radix primitives it needs already exist; sun/moon icons vendored as static SVG (matching existing icon convention) rather than adding an icon library.            |
| IX. Round-Trip Fidelity                     | N/A    | No `token-core` parse/serialize path touched.                                                                                                                                                            |
| X. Component Granularity & Testing          | Pass   | `ThemeToggle` in its own PascalCase folder with co-located `.module.css`/`.test.tsx`/`.a11y.test.tsx`; single, nameable purpose ("let the user switch/see the current appearance").                    |
| XI. Modern Defaults                         | Pass   | New/edited files use ESM throughout, consistent with the rest of the repo; no legacy pattern introduced.                                                                                               |

No violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-light-dark-toggle/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/             # Phase 1 output (/speckit-plan command)
│   ├── use-theme-hook.md
│   └── icon-sprite-generator.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/design-system/
├── sugarcube.config.ts                        # + two data-theme attribute-selector permutations
└── src/design-tokens/dark.json                 # unchanged — already defines every dark value

apps/web-app/
├── app/
│   └── layout.tsx                              # + inline FOUC-prevention <script>, suppressHydrationWarning on <html>
├── hooks/
│   ├── useTheme.ts                              # NEW
│   └── useTheme.test.ts                         # NEW
├── components/
│   └── ThemeToggle/                             # NEW — folder per Principle X
│       ├── ThemeToggle.tsx
│       ├── ThemeToggle.module.css
│       ├── ThemeToggle.test.tsx
│       └── ThemeToggle.a11y.test.tsx
├── assets/
│   ├── icons/
│   │   ├── token-types/                         # MOVED from assets/icons/*.svg (14 files + NOTICE.md)
│   │   └── theme/                                # NEW
│   │       ├── sun.svg
│   │       ├── moon.svg
│   │       └── NOTICE.md
│   ├── generated/                                # NEW, gitignored
│   │   ├── token-types-sprite.ids.ts
│   │   └── theme-sprite.ids.ts
│   └── resolve-token-type-icon-id.ts             # EDITED — sources ids from generated mapping, not literals
├── lib/platform/
│   └── node-fs.ts                                # + injected sync directory-listing function
├── scripts/
│   ├── generate-icon-sprite.ts                   # REWRITTEN — generic folder scanner
│   └── generate-icon-sprite.test.ts              # EDITED — assert per-sprite behavior, both sprites
├── components/TokenBlock/
│   ├── TokenBlock.tsx                            # EDITED — `/icon-sprite.svg` → `/token-types-sprite.svg`
│   └── TokenBlock.test.tsx                       # EDITED — same reference update
└── .gitignore                                    # EDITED — /public/icon-sprite.svg → /public/*-sprite.svg, + /assets/generated/
```

**Structure Decision**: Existing monorepo layout (`apps/web-app` + `packages/design-system`) is unchanged; this feature adds files following the conventions already present in each (component-per-folder, hooks/ for hooks, scripts/ for build tooling, assets/icons/ for vendored SVG source) rather than introducing any new top-level directory convention.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

_No violations — table intentionally omitted._
