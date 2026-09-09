"use client";

import { useEffect, useState } from "react";
import {
	type ReferenceCatalogue,
	ReferenceCatalogueSchema,
} from "../lib/tokens/reference-catalogue-wire.ts";
import type { SaveError } from "../lib/tokens/save-error.ts";

type Status = "idle" | "loading" | "ready" | "error";

/** `idle` until `enabled` — lets a consumer defer the fetch to first activation. */

interface UseReferenceCatalogueResult {
	readonly status: Status;
	readonly catalogue?: ReferenceCatalogue;
	readonly error?: SaveError;
}

const CATALOGUE_ENDPOINT = "/api/tokens/references";

/**
 * Session cache: the whole-directory catalogue rarely changes while the
 * editor is open (a save changes one `$value`, never the set of paths), so
 * it is fetched once and reused across every re-open and every consumer.
 * `resetReferenceCatalogueCache` clears it when the loaded token set itself
 * changes (or between tests).
 */
let cachedCatalogue: ReferenceCatalogue | undefined;
let inflight: Promise<ReferenceCatalogue> | undefined;

export function resetReferenceCatalogueCache(): void {
	cachedCatalogue = undefined;
	inflight = undefined;
}

async function loadCatalogue(
	fetchImpl: typeof fetch,
	signal: AbortSignal,
): Promise<ReferenceCatalogue> {
	if (cachedCatalogue !== undefined) {
		return cachedCatalogue;
	}
	if (inflight === undefined) {
		inflight = (async () => {
			const response = await fetchImpl(CATALOGUE_ENDPOINT, { signal });
			if (!response.ok) {
				throw new Error(
					`catalogue request failed with status ${response.status}`,
				);
			}
			const body: unknown = await response.json();
			const parsed = ReferenceCatalogueSchema.parse(body);
			cachedCatalogue = parsed;
			return parsed;
		})();
		inflight.catch(() => {
			// A failed load must not poison the cache for a later retry.
			inflight = undefined;
		});
	}
	return inflight;
}

/**
 * Fetches the reference catalogue once per session and exposes it as a
 * status enum plus payload / error — never throws (a failed fetch is
 * `status: "error"` with a `SaveError`-shaped `error`), matching this
 * repo's UI-layer hook-state convention.
 */
export function useReferenceCatalogue(
	fetchImpl: typeof fetch = fetch,
	enabled = true,
): UseReferenceCatalogueResult {
	const [state, setState] = useState<UseReferenceCatalogueResult>(() =>
		cachedCatalogue !== undefined
			? { status: "ready", catalogue: cachedCatalogue }
			: { status: enabled ? "loading" : "idle" },
	);

	useEffect(() => {
		if (cachedCatalogue !== undefined) {
			setState({ status: "ready", catalogue: cachedCatalogue });
			return;
		}
		if (!enabled) {
			return;
		}
		setState((prev) => (prev.status === "idle" ? { status: "loading" } : prev));

		const controller = new AbortController();
		let active = true;

		loadCatalogue(fetchImpl, controller.signal).then(
			(catalogue) => {
				if (active) {
					setState({ status: "ready", catalogue });
				}
			},
			(cause: unknown) => {
				if (!active || controller.signal.aborted) {
					return;
				}
				setState({
					status: "error",
					error: {
						kind: "unknown",
						message:
							cause instanceof Error
								? cause.message
								: "Catalogue request failed",
					},
				});
			},
		);

		return () => {
			active = false;
			controller.abort();
		};
	}, [fetchImpl, enabled]);

	return state;
}
