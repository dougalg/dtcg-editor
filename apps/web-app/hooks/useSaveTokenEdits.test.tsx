import { afterEach, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSaveTokenEdits } from "./useSaveTokenEdits.ts";
import type { ClientEdit } from "../lib/tokens/edit-state.ts";

const edits: ClientEdit[] = [{ path: ["spacing", "small"], value: { value: 8, unit: "px" } }];

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a successful save resolves true and returns saveState to idle", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  let succeeded: boolean | undefined;
  await act(async () => {
    succeeded = await result.current.save(edits);
  });

  expect(succeeded).toBe(true);
  expect(result.current.saveState).toBe("idle");
  expect(result.current.saveError).toBeUndefined();
});

test("a 404 response maps to a not-found SaveError (AC-09)", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Token file not found", kind: "not-found", path: "tokens.json" }), {
        status: 404,
      }),
    ),
  );

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  let succeeded: boolean | undefined;
  await act(async () => {
    succeeded = await result.current.save(edits);
  });

  expect(succeeded).toBe(false);
  expect(result.current.saveState).toBe("error");
  expect(result.current.saveError).toEqual({ kind: "not-found", path: "tokens.json" });
});

test("a 400 response maps to a validation SaveError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid edit request", kind: "validation", issues: ["bad value"] }), {
        status: 400,
      }),
    ),
  );

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  await act(async () => {
    await result.current.save(edits);
  });

  expect(result.current.saveError).toEqual({ kind: "validation", issues: ["bad value"] });
});

test("a 422 response maps to an invalid-file SaveError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid token file", kind: "invalid-file", issues: ["parse error"] }), {
        status: 422,
      }),
    ),
  );

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  await act(async () => {
    await result.current.save(edits);
  });

  expect(result.current.saveError).toEqual({ kind: "invalid-file", issues: ["parse error"] });
});

test("a 500 response maps to an unknown SaveError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Failed to save token file", kind: "unknown", message: "disk full" }), {
        status: 500,
      }),
    ),
  );

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  await act(async () => {
    await result.current.save(edits);
  });

  expect(result.current.saveError).toEqual({ kind: "unknown", message: "disk full" });
});

test("a rejected fetch (network failure) maps to an unknown SaveError", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  let succeeded: boolean | undefined;
  await act(async () => {
    succeeded = await result.current.save(edits);
  });

  expect(succeeded).toBe(false);
  expect(result.current.saveError).toEqual({ kind: "unknown", message: "network down" });
});

test("a non-OK response with a missing/malformed kind still degrades to unknown rather than throwing", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "disk full" }), { status: 500 })),
  );

  const { result } = renderHook(() => useSaveTokenEdits("tokens.json"));

  await act(async () => {
    await result.current.save(edits);
  });

  expect(result.current.saveError).toEqual({ kind: "unknown", message: "disk full" });
});
