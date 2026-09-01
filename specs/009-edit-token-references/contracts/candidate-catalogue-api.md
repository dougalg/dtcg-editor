# Contract: Candidate Catalogue API

## Endpoint

`GET /api/tokens/references`

- No path params, no query params. Serves the configured token directory
  (`getConfig().tokensDir`), same as `GET /api/tokens`.
- Idempotent, side-effect-free. Rebuilt on every request; no server cache, no
  `Cache-Control` beyond the framework default.
- New file: `apps/web-app/app/api/tokens/references/route.ts`, with a
  `listReferenceCatalogue(logger?: Logger)` inner function separated from `GET`
  for test injection (same pattern as `app/api/tokens/route.ts`).

## Success — `200`

Body validates against `ReferenceCatalogueSchema`
(`apps/web-app/lib/tokens/reference-catalogue-wire.ts`):

```ts
const ChainStepSchema = z.object({
  path: z.array(z.string()),
  file: z.string(),
  mode: z.string().optional(),
});

const ChainOutcomeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resolved"), value: z.unknown(), type: z.string().optional() }),
  z.object({ kind: z.literal("unresolved"), missingPath: z.array(z.string()) }),
  z.object({ kind: z.literal("group-target"), groupPath: z.array(z.string()) }),
  z.object({ kind: z.literal("circular"), cyclePath: z.array(z.string()) }),
]);

const ResolutionChainWireSchema = z.object({
  steps: z.array(ChainStepSchema),
  outcome: ChainOutcomeSchema,
});

const CandidateDefinitionSchema = z.object({
  mode: z.string().optional(),
  file: z.string(),
  rawValue: z.unknown(),
});

const ReferenceCandidateSchema = z.object({
  path: z.array(z.string()).min(1),
  displayPath: z.string(),
  effectiveType: z.string().optional(),
  definitions: z.array(CandidateDefinitionSchema).min(1),
  preview: z.array(z.object({
    mode: z.string().optional(),
    outcome: ResolutionChainWireSchema,
  })).min(1),
});

export const ReferenceCatalogueSchema = z.object({
  modes: z.array(z.string()),
  candidates: z.array(ReferenceCandidateSchema),
});
export type ReferenceCatalogue = z.infer<typeof ReferenceCatalogueSchema>;
```

**Guarantees**

- `candidates` contains **every token path** defined anywhere in the directory,
  and **no group paths** (SC-002, FR-002).
- Each path appears **exactly once**; `definitions` holds one entry per mode
  when the path is multiply defined, else a single `mode: undefined` entry
  (FR-003).
- `preview[i].outcome` is the result of resolving that candidate's own value
  under `preview[i].mode`, produced by the same resolution path feature 007
  uses (`resolveReferenceSite` logic over the freshly built `ReferenceIndex`).
  Its `steps[]` (each `{ path, file, mode }`) MUST be fully populated — the
  client's `candidate-selectability.isCircularIfSelected` (FR-024) reads them to
  decide, per row, whether repointing here would close a cycle back to the
  edited token, without a second round-trip or a client-side resolve.
- `displayPath === path.join(".")`.
- Ordering of `candidates` is **not guaranteed** — the client sorts.

## Failure

| Condition | Status | Body (`errorResponse` helper) |
| --- | --- | --- |
| Directory scan / load fails (`loadTokenDirectory` `Err`) | `500` | `{ error, kind: "unknown", message }` |
| Resolver file present but invalid | `200` | Catalogue still returned; resolver treated as absent (`modes: []`), matching `page.tsx`'s existing `loadResolverModes` fallback |

The client treats any non-2xx (or a body failing `ReferenceCatalogueSchema`) as
the **unavailable** state (FR-021): the reference stays viewable and editable as
raw alias text, no rich previews.

## Consumer

`apps/web-app/hooks/useReferenceCatalogue.ts`:

- `useReferenceCatalogue(fetchImpl: typeof fetch = fetch)` → `{ status, catalogue, error }`
  where `status: "idle" | "loading" | "ready" | "error"`.
- First consumer to call it triggers one GET; result is memoised in a
  module-scope cache keyed by token-set identity for the session. Subsequent
  hook consumers and re-opens read the cache — no refetch (research §5).
- In-flight request abortable via `AbortController` when the popover closes; a
  completed response still populates the cache.
- Never throws; a failed fetch is `status: "error"` + a `SaveError`-shaped
  `error`.

## Test checklist

- [ ] 200 body validates `ReferenceCatalogueSchema` against the
      `e2e/fixtures/token-references` set.
- [ ] Every token path in the fixture set is present; no group path is.
- [ ] A multiply-defined path yields one candidate with one `definition` per
      mode; `modes` matches the resolver.
- [ ] A candidate whose own value is a chain has `preview.outcome.kind`
      `"resolved"` with the end-of-chain value; a broken one carries the right
      `unresolved` / `circular` / `group-target` kind.
- [ ] `loadTokenDirectory` `Err` → 500 `kind: "unknown"`.
- [ ] Invalid resolver file → 200 with `modes: []`.
- [ ] `listReferenceCatalogue` accepts an injected logger (no console noise in
      tests).
