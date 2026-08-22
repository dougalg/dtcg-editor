import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { THEME_STORAGE_KEY, useTheme } from "./useTheme.ts";

/** A fake `MediaQueryList` whose `.matches` and `change` listeners are
 * controlled directly by the test, so `useTheme` never touches the real
 * `jsdom` `window.matchMedia` (which `jsdom` doesn't implement anyway). */
function createFakeMediaQueryList(initialMatches: boolean) {
	let matches = initialMatches;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	const mql = {
		get matches() {
			return matches;
		},
		addEventListener: (
			_type: "change",
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.add(listener);
		},
		removeEventListener: (
			_type: "change",
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.delete(listener);
		},
	} as unknown as MediaQueryList;

	function setMatches(next: boolean): void {
		matches = next;
		for (const listener of listeners) {
			listener({ matches: next } as MediaQueryListEvent);
		}
	}

	return { mql, setMatches };
}

function createFakeStorage() {
	let value: string | undefined;
	return {
		getStoredTheme: () =>
			value === "light" || value === "dark" ? value : undefined,
		setStoredTheme: (next: "light" | "dark" | undefined) => {
			value = next;
		},
		read: () => value,
	};
}

beforeEach(() => {
	document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
	document.documentElement.removeAttribute("data-theme");
});

test("US1: with no stored preference, resolves to dark when the system prefers dark", () => {
	const { mql } = createFakeMediaQueryList(true);
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("dark");
	expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

test("US1: with no stored preference, resolves to light when the system prefers light", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("light");
});

test("US1: a live system preference change updates theme when no override is stored", () => {
	const { mql, setMatches } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("light");
	act(() => setMatches(true));
	expect(result.current.theme).toBe("dark");
});

test("US2: toggling sets an explicit override opposite the current theme and persists it", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("light");
	act(() => result.current.toggleTheme());
	expect(result.current.theme).toBe("dark");
	expect(storage.read()).toBe("dark");
});

test("US2: an overridden theme persists across a fresh render (survives 'reload')", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();
	document.documentElement.setAttribute("data-theme", "dark");
	storage.setStoredTheme("dark");

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("dark");
});

test("US2: an overridden theme does not react to a live system preference change", () => {
	const { mql, setMatches } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();
	storage.setStoredTheme("dark");
	document.documentElement.setAttribute("data-theme", "dark");

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("dark");
	act(() => setMatches(true));
	expect(result.current.theme).toBe("dark");
});

test("FR-011: a throwing storage read/write is treated as absent, theme still resolves correctly", () => {
	const { mql } = createFakeMediaQueryList(true);
	const getStoredTheme = vi.fn(() => {
		throw new Error("storage blocked");
	});
	const setStoredTheme = vi.fn(() => {
		throw new Error("storage blocked");
	});

	const { result } = renderHook(() =>
		useTheme({ matchMedia: () => mql, getStoredTheme, setStoredTheme }),
	);

	expect(result.current.theme).toBe("dark");
	expect(() => act(() => result.current.toggleTheme())).not.toThrow();
	expect(result.current.theme).toBe("light");
});

test("US3: toggling again when the opposite equals system preference clears the override", () => {
	const { mql } = createFakeMediaQueryList(true); // system prefers dark
	const storage = createFakeStorage();
	storage.setStoredTheme("light"); // explicit override, opposite of system
	document.documentElement.setAttribute("data-theme", "light");

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("light");
	act(() => result.current.toggleTheme());
	expect(result.current.theme).toBe("dark");
	expect(storage.read()).toBeUndefined();
});

test("US3: after clearing the override, live system changes are followed again", () => {
	const { mql, setMatches } = createFakeMediaQueryList(true);
	const storage = createFakeStorage();
	storage.setStoredTheme("light");
	document.documentElement.setAttribute("data-theme", "light");

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	act(() => result.current.toggleTheme()); // clears override, system is dark
	expect(result.current.theme).toBe("dark");

	act(() => setMatches(false)); // system now prefers light
	expect(result.current.theme).toBe("light");
});

test("cross-tab: a storage event for the theme key updates theme to match", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(result.current.theme).toBe("light");

	// Simulate another tab writing "dark" and firing the storage event.
	storage.setStoredTheme("dark");
	act(() => {
		window.dispatchEvent(
			new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
		);
	});

	expect(result.current.theme).toBe("dark");
});
