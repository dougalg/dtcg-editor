import { act, renderHook } from "@testing-library/react";
import { afterEach, assert, expect, test, vi } from "vitest";
import type { ReferenceCatalogue } from "../lib/tokens/reference-catalogue-wire.ts";
import {
	resetReferenceCatalogueCache,
	useReferenceCatalogue,
} from "./useReferenceCatalogue.ts";

const CATALOGUE: ReferenceCatalogue = {
	modes: [],
	candidates: [
		{
			path: ["color", "blue"],
			displayPath: "color.blue",
			effectiveType: "color",
			definitions: [{ mode: undefined, file: "base.json", rawValue: "#00f" }],
			preview: [
				{
					mode: undefined,
					outcome: {
						steps: [
							{ path: ["color", "blue"], file: "base.json", mode: undefined },
						],
						outcome: { kind: "resolved", value: "#00f", type: "color" },
					},
				},
			],
		},
	],
};

function okFetch() {
	return vi
		.fn()
		.mockResolvedValue(
			new Response(JSON.stringify(CATALOGUE), { status: 200 }),
		);
}

afterEach(() => {
	resetReferenceCatalogueCache();
});

test("first use transitions idle to loading to ready with the payload", async () => {
	const fetchImpl = okFetch();
	const { result } = renderHook(() => useReferenceCatalogue(fetchImpl));

	expect(result.current.status).toBe("loading");

	await act(async () => {
		await Promise.resolve();
	});

	expect(result.current.status).toBe("ready");
	assert(result.current.catalogue !== undefined);
	expect(result.current.catalogue.candidates[0]?.displayPath).toBe(
		"color.blue",
	);
});

test("a second consumer, or a re-open, does not trigger a second fetch", async () => {
	const fetchImpl = okFetch();

	const first = renderHook(() => useReferenceCatalogue(fetchImpl));
	await act(async () => {
		await Promise.resolve();
	});
	expect(first.result.current.status).toBe("ready");

	const second = renderHook(() => useReferenceCatalogue(fetchImpl));
	await act(async () => {
		await Promise.resolve();
	});

	expect(second.result.current.status).toBe("ready");
	expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("a rejected fetch yields status error with a SaveError-shaped error and does not throw", async () => {
	const fetchImpl = vi.fn().mockRejectedValue(new Error("network is down"));
	const { result } = renderHook(() => useReferenceCatalogue(fetchImpl));

	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});

	expect(result.current.status).toBe("error");
	expect(result.current.error).toMatchObject({ kind: "unknown" });
	expect(
		result.current.error?.kind === "unknown" && result.current.error.message,
	).toContain("network is down");
});

test("aborting before the response resolves does not reject; a completed response still fills the cache", async () => {
	let resolveFetch: (value: Response) => void = () => {};
	const fetchImpl = vi.fn().mockImplementation(
		() =>
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
	);

	const { unmount } = renderHook(() => useReferenceCatalogue(fetchImpl));
	unmount();

	await act(async () => {
		resolveFetch(new Response(JSON.stringify(CATALOGUE), { status: 200 }));
		await Promise.resolve();
		await Promise.resolve();
	});

	// The in-flight response still populated the module cache: a fresh
	// consumer reads it as ready without a second fetch.
	const fresh = renderHook(() => useReferenceCatalogue(fetchImpl));
	await act(async () => {
		await Promise.resolve();
	});
	expect(fresh.result.current.status).toBe("ready");
	expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("the fetch is reached only through the injected fetchImpl", async () => {
	const fetchImpl = okFetch();
	renderHook(() => useReferenceCatalogue(fetchImpl));
	await act(async () => {
		await Promise.resolve();
	});

	expect(fetchImpl).toHaveBeenCalledTimes(1);
	expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/tokens/references");
});

test("enabled:false stays idle and does not fetch until flipped to true", async () => {
	const fetchImpl = okFetch();
	const { result, rerender } = renderHook(
		({ enabled }: { enabled: boolean }) =>
			useReferenceCatalogue(fetchImpl, enabled),
		{ initialProps: { enabled: false } },
	);

	expect(result.current.status).toBe("idle");
	expect(fetchImpl).not.toHaveBeenCalled();

	rerender({ enabled: true });
	await act(async () => {
		await Promise.resolve();
	});

	expect(fetchImpl).toHaveBeenCalledTimes(1);
	expect(result.current.status).toBe("ready");
});
