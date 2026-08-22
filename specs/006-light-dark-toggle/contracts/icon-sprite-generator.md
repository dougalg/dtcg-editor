# Contract: generalized icon sprite generator

`apps/web-app/scripts/generate-icon-sprite.ts`

## Input

`apps/web-app/assets/icons/<sprite-name>/*.svg` — any number of sprite-name subfolders, each containing any number of standalone `<svg>...</svg>` files. No file or folder name is known to the script in advance; it discovers both by scanning `assets/icons/` at run time (via the injected, synchronous directory-listing function — real default backed by `fs.readdirSync`).

A folder may also contain a `NOTICE.md` (license/attribution) and other non-`.svg` files — anything not ending in `.svg` is ignored by the generator.

## Output

For every subfolder `assets/icons/<sprite-name>/`:

1. `public/<sprite-name>-sprite.svg` — one `<symbol id="dtcg-ed-icon-<basename>">` per `.svg` file in that folder (same `<symbol>` conversion logic as today: presentation attributes preserved, `xmlns` dropped, banner comment marking the file generated). Written only when at least one `.svg` file exists in the folder.
2. `apps/web-app/assets/generated/<sprite-name>-sprite.ids.ts` — a generated file exporting a single `Record<string, string>` constant (name pattern: `<SPRITE_NAME_UPPER>_SPRITE_ICON_IDS`) mapping each `.svg` file's basename to its symbol id.

Both outputs are gitignored (deterministic from `assets/icons/`, matching the existing `/public/icon-sprite.svg` entry generalized to `/public/*-sprite.svg` and a new `/assets/generated/` entry).

## Invocation

Unchanged: `pnpm generate:icons` (`node scripts/generate-icon-sprite.ts`), already a prerequisite of `apps/web-app`'s `dev`, `build`, and `test` scripts. Adding a new folder under `assets/icons/` or a new `.svg` file to an existing folder requires no script edit — the next `generate:icons` run picks it up.

## Non-goals

- No per-file metadata (attribution, custom ids, ordering) is read from the script — anything like that belongs in the source folder itself (`NOTICE.md`, or a leading XML comment inside the `.svg` file, both of which pass through unmodified as part of each file's own content — the script does not strip or rewrite comments outside the `<svg>...</svg>` tags it parses).
- Domain-specific type→icon mappings (e.g. which DTCG token `$type` uses which icon) are out of scope for the generator; they stay hand-written (`resolve-token-type-icon-id.ts`) and now source their id *values* from this contract's generated mapping instead of literal strings.
