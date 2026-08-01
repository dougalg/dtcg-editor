export const dynamic = "force-dynamic";

/**
 * Unconditionally throws so `e2e/error-page.spec.ts` can render the root
 * `app/error.tsx` boundary against a real running app. This repo's strict
 * Result-pattern discipline (see `docs/project.md`) means there is no
 * organic user-reachable path that produces an unhandled exception —
 * `getConfig()`'s own defensive throw is provably unreachable in normal
 * operation. This route exists solely as that missing path for testing.
 */
export default function ErrorBoundaryCheckPage(): never {
	throw new Error("Intentional throw for error-boundary a11y testing.");
}
