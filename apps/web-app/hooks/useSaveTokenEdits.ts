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
 * Defensively parses a PATCH response's JSON body into a `SaveError`,
 * reading `kind` directly off the body rather than re-deriving it from
 * `status` (AC-09) — `status` is only used to synthesize a fallback
 * message if the body itself is missing/malformed. This is a hand-rolled
 * type guard rather than a Zod schema: unlike the genuinely external edges
 * `docs/project.md`'s Validation at the Edges constraint targets (file
 * reads, third-party calls), this is a same-codebase contract this
 * feature's own two halves (`route.ts`'s `errorResponse` and this parser)
 * are introduced together, so it degrades safely to `"unknown"` instead of
 * throwing if the body is ever malformed.
 */
function parseSaveError(body: unknown, status: number): SaveError {
  if (typeof body === "object" && body !== null && "kind" in body) {
    const kind = (body as { kind: unknown }).kind;
    if (kind === "not-found") {
      const path = (body as { path?: unknown }).path;
      return { kind, path: typeof path === "string" ? path : "" };
    }
    if (kind === "validation" || kind === "invalid-file") {
      const issues = (body as { issues?: unknown }).issues;
      return { kind, issues: Array.isArray(issues) ? issues.filter((i): i is string => typeof i === "string") : [] };
    }
    if (kind === "unknown") {
      const message = (body as { message?: unknown }).message;
      return { kind, message: typeof message === "string" ? message : `Save failed with status ${status}` };
    }
  }
  const error = (body as { error?: unknown } | null)?.error;
  return { kind: "unknown", message: typeof error === "string" ? error : `Save failed with status ${status}` };
}

/**
 * Client Component hook wrapping a PATCH call to
 * `app/api/tokens/[...path]/route.ts` — the reference implementation of
 * this repo's UI-layer hook-state convention (`docs/project.md`'s Error
 * Handling constraint): a failed save is always unwrapped into returned
 * state (`saveState`/`saveError`), never a thrown exception for the caller
 * to catch.
 */
export function useSaveTokenEdits(relativePath: string): UseSaveTokenEditsResult {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);

  async function save(edits: readonly ClientEdit[]): Promise<boolean> {
    setSaveState("pending");
    setSaveError(undefined);

    let response: Response;
    try {
      response = await fetch(`/api/tokens/${relativePath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edits }),
      });
    } catch (cause) {
      setSaveState("error");
      setSaveError({ kind: "unknown", message: cause instanceof Error ? cause.message : "Save failed" });
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
