import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useTheme } from "./useTheme.ts";

/** A fake `MediaQueryList` whose `.matches` is controlled directly by the
 * test, so `useTheme` never touches the real `jsdom` `window.matchMedia`
 * (which `jsdom` doesn't implement anyway).
 *
 * It carries no `change`-listener plumbing any more: live OS reactivity moved
 * out of this hook and into the stylesheet's
 * `@media (prefers-color-scheme: dark)` block, which no unit test in `jsdom`
 * can meaningfully exercise — `e2e/theme-toggle.spec.ts` covers it instead,
 * with a real browser and a real `colorScheme` setting. */
function createFakeMediaQueryList(matches: boolean) {
	return { matches } as unknown as MediaQueryList;
}

/** Stands in for the preference cookie. */
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

/** Stands in for a `BroadcastChannel`, which `jsdom` doesn't implement.
 * `receive()` simulates a *different* tab's ping arriving. */
function createFakeChannel() {
	const posted: unknown[] = [];
	let closed = false;
	const channel = {
		onmessage: null,
		postMessage: (data: unknown) => {
			posted.push(data);
		},
		close: () => {
			closed = true;
		},
	} as unknown as BroadcastChannel;

	return {
		channel,
		posted,
		isClosed: () => closed,
		receive: () => channel.onmessage?.(new MessageEvent("message")),
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

test("FR-006: mounting with no override leaves data-theme absent, so CSS keeps following the OS", () => {
	const storage = createFakeStorage();

	renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(true), // OS prefers dark
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => createFakeChannel().channel,
		}),
	);

	// The old hook resolved the OS preference here and wrote data-theme="dark".
	// That would now be a bug: it pins the appearance and the media query can
	// never apply again.
	expect(currentDataTheme()).toBeNull();
});

test("mounting does not disturb the data-theme the server already rendered", () => {
	const storage = createFakeStorage();
	storage.setStoredTheme("dark");
	document.documentElement.setAttribute("data-theme", "dark");

	renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => createFakeChannel().channel,
		}),
	);

	expect(currentDataTheme()).toBe("dark");
	expect(storage.read()).toBe("dark");
});

test("US2: activateTheme('dark') against a light OS sets an explicit override and persists it", () => {
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => createFakeChannel().channel,
		}),
	);

	act(() => result.current.activateTheme("dark"));

	expect(currentDataTheme()).toBe("dark");
	expect(storage.read()).toBe("dark");
});

test("US3: activating the theme the OS already prefers clears the override and removes the attribute", () => {
	const storage = createFakeStorage();
	storage.setStoredTheme("light"); // explicit override, opposite of the OS
	document.documentElement.setAttribute("data-theme", "light");

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(true), // OS prefers dark
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => createFakeChannel().channel,
		}),
	);

	act(() => result.current.activateTheme("dark")); // dark == OS preference

	expect(storage.read()).toBeUndefined();
	// Crucially the attribute is *removed*, not set to "dark": the page is
	// handed back to the media query so later OS changes are followed again
	// (FR-006). Setting it to "dark" would look identical right now and be
	// wrong the moment the OS switches to light.
	expect(currentDataTheme()).toBeNull();
});

test("FR-011: a throwing storage read/write is treated as absent and never throws", () => {
	const getStoredTheme = vi.fn(() => {
		throw new Error("cookie blocked");
	});
	const setStoredTheme = vi.fn(() => {
		throw new Error("cookie blocked");
	});

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(true),
			getStoredTheme,
			setStoredTheme,
			createThemeChannel: () => createFakeChannel().channel,
		}),
	);

	expect(() => act(() => result.current.activateTheme("light"))).not.toThrow();
	expect(currentDataTheme()).toBe("light");
});

test("FR-011: an unavailable BroadcastChannel leaves the toggle fully working", () => {
	const storage = createFakeStorage();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => undefined,
		}),
	);

	expect(() => act(() => result.current.activateTheme("dark"))).not.toThrow();
	expect(currentDataTheme()).toBe("dark");
	expect(storage.read()).toBe("dark");
});

test("cross-tab: activating a theme pings the other tabs", () => {
	const storage = createFakeStorage();
	const fake = createFakeChannel();

	const { result } = renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => fake.channel,
		}),
	);

	act(() => result.current.activateTheme("dark"));

	expect(fake.posted).toHaveLength(1);
});

test("cross-tab: a ping from another tab re-reads the cookie and applies the override", () => {
	const storage = createFakeStorage();
	const fake = createFakeChannel();

	renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => fake.channel,
		}),
	);

	expect(currentDataTheme()).toBeNull();

	// Another tab wrote the shared cookie, then pinged.
	storage.setStoredTheme("dark");
	act(() => {
		fake.receive();
	});

	expect(currentDataTheme()).toBe("dark");
});

test("cross-tab: a ping after another tab cleared the override removes the attribute", () => {
	const storage = createFakeStorage();
	storage.setStoredTheme("dark");
	document.documentElement.setAttribute("data-theme", "dark");
	const fake = createFakeChannel();

	renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => fake.channel,
		}),
	);

	storage.setStoredTheme(undefined);
	act(() => {
		fake.receive();
	});

	expect(currentDataTheme()).toBeNull();
});

test("the channel is closed on unmount", () => {
	const storage = createFakeStorage();
	const fake = createFakeChannel();

	const { unmount } = renderHook(() =>
		useTheme({
			matchMedia: () => createFakeMediaQueryList(false),
			getStoredTheme: storage.getStoredTheme,
			setStoredTheme: storage.setStoredTheme,
			createThemeChannel: () => fake.channel,
		}),
	);

	expect(fake.isClosed()).toBe(false);
	unmount();
	expect(fake.isClosed()).toBe(true);
});
