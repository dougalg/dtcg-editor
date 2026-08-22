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

function currentDataTheme(): string | null {
	return document.documentElement.getAttribute("data-theme");
}

beforeEach(() => {
	document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
	document.documentElement.removeAttribute("data-theme");
});

test("US1: with no stored preference, applies dark when the system prefers dark", () => {
	const { mql } = createFakeMediaQueryList(true);
	const storage = createFakeStorage();

	renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("dark");
});

test("US1: with no stored preference, applies light when the system prefers light", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("light");
});

test("US1: a live system preference change updates data-theme when no override is stored", () => {
	const { mql, setMatches } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("light");
	act(() => setMatches(true));
	expect(currentDataTheme()).toBe("dark");
});

test("US2: activateTheme('dark') sets an explicit override and persists it", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("light");
	act(() => result.current.activateTheme("dark"));
	expect(currentDataTheme()).toBe("dark");
	expect(storage.read()).toBe("dark");
});

test("US2: an overridden theme is re-applied on a fresh render (survives 'reload')", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();
	storage.setStoredTheme("dark");

	renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("dark");
});

test("US2: an overridden theme does not react to a live system preference change", () => {
	const { mql, setMatches } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();
	storage.setStoredTheme("dark");

	renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("dark");
	act(() => setMatches(true));
	expect(currentDataTheme()).toBe("dark");
});

test("FR-011: a throwing storage read/write is treated as absent, data-theme still resolves correctly", () => {
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

	expect(currentDataTheme()).toBe("dark");
	expect(() => act(() => result.current.activateTheme("light"))).not.toThrow();
	expect(currentDataTheme()).toBe("light");
});

test("US3: activating the theme that matches system preference clears the override", () => {
	const { mql } = createFakeMediaQueryList(true); // system prefers dark
	const storage = createFakeStorage();
	storage.setStoredTheme("light"); // explicit override, opposite of system

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("light");
	act(() => result.current.activateTheme("dark")); // dark == system preference
	expect(currentDataTheme()).toBe("dark");
	expect(storage.read()).toBeUndefined();
});

test("US3: after clearing the override, live system changes are followed again", () => {
	const { mql, setMatches } = createFakeMediaQueryList(true);
	const storage = createFakeStorage();
	storage.setStoredTheme("light");

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	act(() => result.current.activateTheme("dark")); // clears override, system is dark
	expect(currentDataTheme()).toBe("dark");

	act(() => setMatches(false)); // system now prefers light
	expect(currentDataTheme()).toBe("light");
});

test("cross-tab: a storage event for the theme key updates data-theme to match", () => {
	const { mql } = createFakeMediaQueryList(false);
	const storage = createFakeStorage();

	renderHook(() =>
		useTheme({
			matchMedia: () => mql,
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
		}),
	);

	expect(currentDataTheme()).toBe("light");

	// Simulate another tab writing "dark" and firing the storage event.
	storage.setStoredTheme("dark");
	act(() => {
		window.dispatchEvent(
			new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
		);
	});

	expect(currentDataTheme()).toBe("dark");
});
