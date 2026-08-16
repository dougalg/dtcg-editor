"use client";

import { consoleLogger } from "@dtcg-editor/errors";
import { useEffect } from "react";

/**
 * Root Next.js App Router error boundary — a safety net for genuinely
 * unexpected render-time exceptions only (the UI-layer analog of
 * `UnknownError`), per `docs/project.md`'s Error Handling constraint.
 * Expected/named failures are always handled via Server Component
 * branching or hook state instead of throwing; this boundary is never
 * relied on as the primary mechanism for those.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		consoleLogger.error(
			{ error, digest: error.digest },
			"Unhandled error caught by root error boundary",
		);
	}, [error]);

	return (
		<main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
			<h1>Something went wrong</h1>
			<p role="alert">An unexpected error occurred.</p>
			<button type="button" onClick={reset}>
				Try again
			</button>
		</main>
	);
}
