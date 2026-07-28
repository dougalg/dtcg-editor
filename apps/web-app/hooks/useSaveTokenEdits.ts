"use client";

import { useState } from "react";
import type { ClientEdit } from "../lib/tokens/edit-state.ts";
import type { SaveError } from "../lib/tokens/save-error.ts";

type SaveState = "idle" | "pending" | "error";

interface UseSaveTokenEditsResult {
	readonly saveState: SaveState;
	readonly saveError: SaveError | undefined;
	readonly save: (edits: readonly ClientEdit[]) => Promise<boolean>;
}

/**
 * Parses a PATCH response's JSON body into a `SaveError`, reading `kind`
 * directly off the body rather than re-deriving it from `status` (AC-09).
 * `route.ts`'s `errorResponse` helper is the single producer of this body
 * shape and is itself built from `SaveError` values, so this is a
 * same-codebase wire contract rather than a genuinely external boundary
 * (unlike the file reads / third-party calls `docs/project.md`'s
 * Validation at the Edges constraint targets) — the body is cast to the
 * shared `SaveError` type instead of re-validated field-by-field at
 * runtime. `status` is only used to synthesize a fallback message if the
 * body itself is missing or was produced before this contract existed.
 */
function parseSaveError(body: unknown, status: number): SaveError {
	if (typeof body === "object" && body !== null && "kind" in body) {
		return body as SaveError;
	}
	const error = (body as { error?: unknown } | null)?.error;
	return {
		kind: "unknown",
		message:
			typeof error === "string" ? error : `Save failed with status ${status}`,
	};
}

/**
 * Client Component hook wrapping a PATCH call to
 * `app/api/tokens/[...path]/route.ts` — the reference implementation of
 * this repo's UI-layer hook-state convention (`docs/project.md`'s Error
 * Handling constraint): a failed save is always unwrapped into returned
 * state (`saveState`/`saveError`), never a thrown exception for the caller
 * to catch.
 */
export function useSaveTokenEdits(
	relativePath: string,
	fetchImpl: typeof fetch = fetch,
): UseSaveTokenEditsResult {
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);

	async function save(edits: readonly ClientEdit[]): Promise<boolean> {
		setSaveState("pending");
		setSaveError(undefined);

		let response: Response;
		try {
			response = await fetchImpl(`/api/tokens/${relativePath}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ edits }),
			});
		} catch (cause) {
			setSaveState("error");
			setSaveError({
				kind: "unknown",
				message: cause instanceof Error ? cause.message : "Save failed",
			});
			return false;
		}

		if (response.ok) {
			setSaveState("idle");
			return true;
		}

		const body: unknown = await response.json().catch(() => undefined);
		setSaveState("error");
		setSaveError(parseSaveError(body, response.status));
		return false;
	}

	return { saveState, saveError, save };
}
