/**
 * The shape every non-2xx JSON response body from
 * `app/api/tokens/[...path]/route.ts`'s `GET`/`PATCH` handlers carries
 * (as the fields below, alongside the existing `error`/`details` fields),
 * and the error state `useSaveTokenEdits` (`hooks/useSaveTokenEdits.ts`)
 * exposes after a failed save — shared so the wire contract and the
 * client-side state it unwraps into can't drift apart. Mirrors the
 * route's existing 400/404/422/500 status-code taxonomy.
 */
export type SaveError =
  | { readonly kind: "not-found"; readonly path: string }
  | { readonly kind: "validation"; readonly issues: readonly string[] }
  | { readonly kind: "invalid-file"; readonly issues: readonly string[] }
  | { readonly kind: "unknown"; readonly message: string };
