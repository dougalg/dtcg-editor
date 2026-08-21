# Icon library options for a React 19 / Next.js app: is hand-rolled inline SVG still right for TreeTokenNode's ~14 icons?

## Distilled rationale

No icon library is currently a dependency anywhere in this repo. `@radix-ui/react-slot` (used by `Badge`) is Radix's composition/`asChild` primitive — a way to merge props onto a child element — and has no relationship to icons at all; `@radix-ui/react-icons` is a completely separate, independently-published Radix package that is not installed. `packages/design-system/package.json` pulls in nine `@radix-ui/react-*` headless-behavior packages (accordion, avatar, checkbox, dialog, dropdown-menu, label, popover, radio-group, select, switch, tabs) but zero icon packages, in this workspace or any other `package.json` in the repo. So the premise that an icon dependency is already "half-present" via the Radix ecosystem doesn't hold — adding any of these libraries would be a net-new dependency requiring the Principle VIII justification the current `plan.md`/`research.md` already declined to provide.

On the merits, independent of that constraint: all six candidates researched are SVG-inlined React components (`currentColor`-styleable, no icon fonts anywhere in this shortlist), all ship tree-shakable ES module named exports, and all support React 19 as a peer dependency today. If this project *did* decide to add a library, **Lucide** (`lucide-react`) is the strongest fit for "simple, easy to use, performant": genuinely tree-shakable via real per-icon ES module exports (not react-icons' barrel-file pattern, which has a documented history of blowing past tree-shaking in some Webpack/CRA configurations — GitHub issue `react-icons/react-icons#574`), a single flat `import { Camera } from 'lucide-react'` API with no weight/variant prop system to learn, 1600+ actively-maintained icons (a fork/community successor to the now-dormant Feather Icons, so its DNA is the same minimalist-outline style already implied by this feature's icon needs), and an ISC license. `@radix-ui/react-icons` is the next-best option specifically *because* this repo is already Radix-native for headless component behavior — same org, same design language as the primitives already in `packages/design-system` — but its 15x15-fixed-size, ~300-icon set is thin for arbitrary future needs and its GitHub repo shows a slower release cadence than Lucide's.

But the actual answer to the open question: **hand-rolled inline SVG, the currently-planned approach, is still the better fit for this specific feature**, and not merely because it avoids a constitution fight. The feature needs exactly 14 fixed icons (13 DTCG token types + 1 fallback), chosen as loose metaphors for abstract concepts (`cubicBezier`, `transition`, `strokeStyle`) that no general-purpose icon library was designed around — there is no "cubic bezier" or "DTCG token type" icon in Lucide, Phosphor, Tabler, Radix, Heroicons, or react-icons's aggregated sets; every one of these 14 choices is already going to be a curatorial judgment call requiring browsing several libraries or drawing bespoke marks (e.g. an actual bezier-curve glyph), not a literal string match. A library earns its keep when an app needs a large, growing, or user-uncertain icon vocabulary — this one is small, closed, and already fully enumerated in `research.md` §3. At 14 icons, even Lucide's best-case ~0.5–1KB-per-icon tree-shaken cost is real but trivially small either way (roughly 7–14KB) — so "performance" doesn't differentiate the two approaches at this icon count; hand-rolled SVG's real advantages are that it needs zero new dependency, zero version/React-19-compat surface to track, and zero risk of the exact icon this feature wants not existing (or existing but visually inconsistent with sibling icons drawn by a different artist for a different taste) in someone else's set. If this feature's icon needs later grow into a general, open-ended icon vocabulary elsewhere in the app (nav icons, generic UI affordances, etc.), that is the point to revisit this decision and justify Lucide in a plan.md — not now, for 14 fixed, purpose-specific glyphs.

## Findings by candidate

### lucide-react
- **Install / API**: `pnpm add lucide-react`; `import { Camera } from 'lucide-react'; <Camera />`. Flat named-export API, no wrapper/weight props required.
- **Tree-shaking**: "Lucide is built with ES Modules, so it's completely tree-shakable" (own docs) — per-icon named exports, not a sprite or font. Practical reports put a tree-shaken single icon around 0.5–1KB.
- **Icon count / coverage**: 1600+ icons — comfortably covers 14 abstract-metaphor picks, though none map literally to DTCG concepts like `cubicBezier` or `strokeStyle`; still requires curatorial choice.
- **Maintenance**: Actively maintained community fork/successor of Feather Icons (its own GitHub README states "a fork of Feather Icons"); Feather itself has been effectively dormant for years. ISC license.
- **React peer dependency**: `"react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"` (registry data, v1.33.0) — explicit React 19 support.
- **Format**: Inlined SVG components, `currentColor`-styleable. No font.

### @radix-ui/react-icons
- **Install / API**: `npm install @radix-ui/react-icons`; `import { FaceIcon, ImageIcon, SunIcon } from "@radix-ui/react-icons"`, used directly as JSX elements.
- **Tree-shaking**: Per-icon named exports (same pattern as Lucide); package unpacked size ~3.3MB total but only imported icons ship in a consumer's bundle.
- **Icon count / coverage**: A much smaller, fixed 15×15px set (order of a few hundred icons per the site) — thin relative to Lucide/Phosphor/Tabler; some of the 14 concepts here would be a stretch.
- **Maintenance**: MIT licensed, "Copyright © 2022–present WorkOS" (Radix's current steward). Same publishing org as the `@radix-ui/react-*` primitives already used throughout `packages/design-system`, which is the one concrete advantage over Lucide for this repo specifically — but the fixed 15×15 size and smaller set are real trade-offs.
- **React peer dependency**: `"react": "^16.x || ^17.x || ^18.x || ^19.0.0 || ^19.0.0-rc"` (registry data, v1.3.2) — explicit React 19 support.
- **Format**: Inlined SVG components. No font.

### react-icons
- **Install / API**: `import { FaBeer } from 'react-icons/fa'; <FaBeer />` — aggregates 30+ source icon sets (Font Awesome, Material Design, Phosphor, Bootstrap, Tabler, Heroicons, Remix, and more) behind one package, imported per-set by path.
- **Tree-shaking**: This is the one genuine point of confusion the research brief flagged, and it's real: react-icons uses ES6 named exports from large per-set barrel files, and its own GitHub issue tracker (`react-icons/react-icons#574`, "Doesn't tree shake when bundled with Webpack and Create React App") documents real-world builds where a single imported icon pulled in the whole set under some Webpack/CRA configurations. The project's own fallback advice for problem bundlers is a separate `@react-icons/all-files` package with direct per-icon file paths — a materially different (and slower-installing) import pattern than the "just import the named icon" story the main package advertises. Modern Vite/esbuild-based toolchains (this repo's likely Next.js/Turbopack or Webpack-5 setup) tree-shake it correctly in most reports, but it is not the clean guarantee Lucide/Radix/Tabler/Phosphor give via genuinely small, single-set per-icon modules.
- **Icon count / coverage**: Enormous in aggregate (tens of thousands across wrapped sets) — total package unpacked size is ~88MB, by far the largest of any candidate researched, underscoring that it is an aggregator, not a curated set.
- **Maintenance**: MIT (confirmed via GitHub repo, not stated on the doc site itself). Actively maintained, v5.7.0.
- **React peer dependency**: `"react": "*"` — any version, including 19.
- **Format**: Inlined SVG components (as re-exported from whichever underlying set), no font.

### @heroicons/react
- **Install / API**: `npm install @heroicons/react`; `import { BeakerIcon } from '@heroicons/react/24/solid'`. Icons are split by size/style into `24/outline`, `24/solid`, `20/solid`, `16/solid` subpaths — an extra "which subpath" decision react-icons/Lucide/Radix don't require.
- **Tree-shaking**: Per-icon, per-subpath ES exports; registry unpacked size ~3.7MB total package.
- **Icon count / coverage**: 316 icons across outline/solid/mini/micro styles — a small, curated, UI-chrome-flavored set (checkmarks, bell, cog) rather than abstract/technical metaphors; would be the thinnest fit of the SVG-based candidates for concepts like `cubicBezier` or `gradient`.
- **Maintenance**: Maintained by Tailwind Labs; MIT licensed; the project's own GitHub README states it accepts bug fixes only, not new icon submissions — a narrower contribution model than Lucide/Phosphor/Tabler.
- **React peer dependency**: `"react >= 16 || ^19.0.0-rc"` (registry data, v2.2.0) — React 19 covered.
- **Format**: Inlined SVG components. No font.

### @phosphor-icons/react
- **Install / API**: `npm i @phosphor-icons/react`; `import { HorseIcon, HeartIcon } from "@phosphor-icons/react"; <HeartIcon color="#AE2983" weight="fill" size={32} />` — every icon carries a `weight` prop (`thin`/`light`/`regular`/`bold`/`fill`/`duotone`), a genuinely useful axis for this feature's "active vs. inactive" or "filled vs. outline" states, at the cost of one more concept to learn than Lucide's flat API.
- **Tree-shaking**: Own docs state "Phosphor supports tree-shaking, so your bundle only includes code for the icons you use," but the same docs recommend importing from `@phosphor-icons/react/dist/csr/IconName` directly (rather than the root barrel) to avoid the dev-mode cost of transpiling all modules, and calls out Next.js's `optimizePackageImports` config as the production fix — i.e. it needs a bit more bundler-awareness than Lucide/Radix/Tabler's plain default-import story to get the clean result.
- **Icon count / coverage**: 9,000+ icons across 6 weights — the largest curated (non-aggregated) set researched; comfortably covers all 14 categories with room to spare, including several duotone/bold treatments that could visually distinguish token types.
- **Maintenance**: MIT licensed, actively maintained (v2.1.10).
- **React peer dependency**: `react >= 16.8`, `react-dom >= 16.8` — no upper bound, so React 19 is compatible but not called out explicitly the way Lucide/Radix/Heroicons registry metadata does.
- **Format**: Inlined SVG components. No font.

### @tabler/icons-react
- **Install / API**: `npm install @tabler/icons-react`; `import { IconArrowLeft } from '@tabler/icons-react'; <IconArrowLeft color="red" size={48} />`. Every icon name is prefixed `Icon...`, otherwise a flat API like Lucide's.
- **Tree-shaking**: Own docs state the package "is built with ES modules... completely tree-shakable"; registry unpacked size is the largest of the curated (non-aggregator) sets at ~66MB total, consistent with its icon count.
- **Icon count / coverage**: 6,150+ icons (per tabler.io's own count) — large, comfortably covers all 14 categories.
- **Maintenance**: MIT licensed, actively maintained (v3.46.0), 21.4k GitHub stars per the project's own site.
- **React peer dependency**: `"react": ">= 16"` — no explicit React 19 pin, but no upper bound either, consistent with the other candidates' compatibility.
- **Format**: Inlined SVG components. No font.

## Sources

1. **Repo package.json files (read directly)** — `packages/design-system/package.json`, `apps/web-app/package.json`, and every other `package.json` under `packages/*` and `apps/*` in this worktree, 2026-08-21.
   Confirms zero icon-related dependencies anywhere in the repo today. `packages/design-system/package.json` lists nine `@radix-ui/react-*` packages (`accordion`, `avatar`, `checkbox`, `dialog`, `dropdown-menu`, `label`, `popover`, `radio-group`, `select`, `slot`, `switch`, `tabs`) — `@radix-ui/react-slot` (used by `Badge` for its `asChild` composition pattern) is a prop-merging primitive, not an icon package, and `@radix-ui/react-icons` is not among them.

2. **Constitution — Technology Stack & Approved Dependencies** — `.specify/memory/constitution.md` (read directly, 2026-08-21).
   Confirms the approved-dependency list (TypeScript, React, Next.js, ESLint/typescript-eslint/eslint-config-next, Zod, neverthrow, pnpm, Turborepo, commitlint/commitizen/husky/prettier, vitest stack, `colorjs.io`, `@ls-lint/ls-lint`) contains no icon library, and Principle VIII requires any addition outside this list to be flagged and justified in the relevant feature's `plan.md` before use.

3. **`specs/005-tree-token-node-block/research.md`** (read directly, 2026-08-21).
   §3 records the current in-flight decision: hand-authored inline SVG, one per `DtcgTokenType` (13 types) plus one fallback, specifically because "No icon library appears in the constitution's approved-dependency list" and Principle VIII disfavors new dependencies for a need built-ins already satisfy.

4. **Lucide — "Lucide for React" guide** — https://lucide.dev/guide/react/getting-started
   Primary source for install commands (`npm install lucide-react` / pnpm / yarn / bun) and the canonical single-icon usage snippet (`import { Camera } from 'lucide-react'; <Camera />`). States "Lucide is built with ES Modules, so it's completely tree-shakable."

5. **Lucide — package guide overview** — https://lucide.dev/guide/packages/lucide-react
   States "Only the icons you import are included in your final bundle," confirms ISC license, and links a dedicated "Migration from React Feather" guide.

6. **`lucide-icons/lucide` GitHub repository README** — https://github.com/lucide-icons/lucide#readme
   Primary source for Lucide's own description of itself as "a fork of Feather Icons," positioning it as the community-maintained successor to the now largely dormant Feather Icons project; states the library ships "1600+ vector (svg) files."

7. **npm registry — `lucide-react` latest version metadata** — https://registry.npmjs.org/lucide-react/latest
   Primary source for exact peer dependency range (`"react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"`, i.e. explicit React 19 support), license (ISC), and current version (1.33.0) as of this research.

8. **Radix Icons site** — https://www.radix-ui.com/icons
   Primary source for install command (`npm install @radix-ui/react-icons`) and JSX usage pattern (`import { FaceIcon, ImageIcon, SunIcon } from "@radix-ui/react-icons"`); confirms MIT license, "Copyright © 2022–present WorkOS," and SVG/Figma availability (no icon-font format offered).

9. **npm registry — `@radix-ui/react-icons` latest version metadata** — https://registry.npmjs.org/@radix-ui/react-icons/latest
   Primary source for peer dependency range (`"react": "^16.x || ^17.x || ^18.x || ^19.0.0 || ^19.0.0-rc"`, explicit React 19 support), license (MIT), version (1.3.2), and total package unpacked size (~3.3MB, all icons combined pre-tree-shaking).

10. **React Icons documentation site** — https://react-icons.github.io/react-icons/
    Primary source for the "just import the named icon" usage pattern (`import { FaBeer } from 'react-icons/fa'`) and the project's own stated tree-shaking claim ("ES6 imports that allow you to include only the icons that your project is using"), plus the list of 30+ wrapped icon sets (Font Awesome, Material Design, Phosphor, Bootstrap, Tabler, and more) and the existence of a separate `@react-icons/all-files` package for bundlers that don't tree-shake it cleanly.

11. **`react-icons/react-icons` GitHub issue #574, "Doesn't tree shake when bundled with Webpack and Create React App"** — https://github.com/react-icons/react-icons/issues/574
    Primary source for the documented, real-world tree-shaking failure mode this research brief specifically asked to check: a single imported icon pulling in the full underlying set under some Webpack/CRA configurations — the concrete evidence behind react-icons' "aggregator with a tree-shaking asterisk" reputation, as opposed to Lucide/Radix/Tabler/Phosphor's cleaner per-icon-module story.

12. **npm registry — `react-icons` latest version metadata** — https://registry.npmjs.org/react-icons/latest
    Primary source for peer dependency (`"react": "*"`, any version including 19), and total package unpacked size (~88MB across all 30+ wrapped sets combined) — the largest of any candidate researched, underscoring its aggregator nature versus a single curated set.

13. **Heroicons site** — https://heroicons.com/
    Primary source for icon count (316), the four style/size categories offered (24px outline, 24px solid, 20px solid, 16px solid — no icon-font format), and MIT license.

14. **`tailwindlabs/heroicons` GitHub repository README** — https://github.com/tailwindlabs/heroicons#readme
    Primary source for install command (`npm install @heroicons/react`), JSX usage (`import { BeakerIcon } from '@heroicons/react/24/solid'`), confirms Tailwind Labs as maintainer, and states the project accepts "bug fixes only" — not new icon or framework-support requests — a narrower contribution model than the other candidates.

15. **npm registry — `@heroicons/react` latest version metadata** — https://registry.npmjs.org/@heroicons/react/latest
    Primary source for peer dependency (`"react >= 16 || ^19.0.0-rc"`, React 19 covered), license (MIT), version (2.2.0), and unpacked size (~3.7MB total package).

16. **`phosphor-icons/react` GitHub repository README** — https://github.com/phosphor-icons/react#readme
    Primary source for install command (`npm i @phosphor-icons/react`), JSX usage including the `weight`/`color`/`size` prop API (`<HeartIcon color="#AE2983" weight="fill" size={32} />`), the stated tree-shaking claim with the caveat about importing from `@phosphor-icons/react/dist/csr/IconName` or using Next.js's `optimizePackageImports` for a clean production result, icon count (9,000+), and MIT license.

17. **npm registry — `@phosphor-icons/react` latest version metadata** — https://registry.npmjs.org/@phosphor-icons/react/latest
    Primary source for peer dependencies (`react >= 16.8`, `react-dom >= 16.8`, no upper bound), license (MIT), version (2.1.10), and total package unpacked size (~33MB across all 6 weights).

18. **`tabler/tabler-icons` GitHub repository, `packages/icons-react` README** — https://github.com/tabler/tabler-icons/tree/main/packages/icons-react#readme
    Primary source for install command (`npm install @tabler/icons-react`), JSX usage (`import { IconArrowLeft } from '@tabler/icons-react'`), the `size`/`color`/`stroke` prop API, the stated "completely tree-shakable" ES-modules claim, and MIT license.

19. **Tabler Icons site** — https://tabler.io/icons
    Primary source for total icon count (6,150+ / 6,184 per the site's own count) and current version (v3.46.0); confirms free/open-source MIT licensing alongside an optional commercial-support tier, and 21.4k GitHub stars.

20. **npm registry — `@tabler/icons-react` latest version metadata** — https://registry.npmjs.org/@tabler/icons-react/latest
    Primary source for peer dependency (`"react": ">= 16"`, no upper bound — React 19 compatible), license (MIT), version (3.46.0), and total package unpacked size (~66MB, the largest curated non-aggregator set researched).
