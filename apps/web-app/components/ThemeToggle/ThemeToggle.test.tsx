import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle.tsx";

const activateTheme = vi.fn();

/** What `useTheme` would resolve as the theme currently on screen. The
 * component must never re-derive this from `data-theme` itself: a missing
 * attribute means "follow the OS", not "light". */
let effectiveTheme: "light" | "dark" = "light";
let notifyEffectiveThemeChange: (() => void) | undefined;
const unsubscribe = vi.fn();

vi.mock("../../hooks/useTheme.ts", () => ({
	useTheme: () => ({
		activateTheme,
		resolveEffectiveTheme: () => effectiveTheme,
		subscribeToEffectiveTheme: (listener: () => void) => {
			notifyEffectiveThemeChange = listener;
			return unsubscribe;
		},
	}),
}));

beforeEach(() => {
	effectiveTheme = "light";
	notifyEffectiveThemeChange = undefined;
});

afterEach(() => {
	cleanup();
	activateTheme.mockClear();
	unsubscribe.mockClear();
});

function iconHrefs(container: Element): string[] {
	return Array.from(container.querySelectorAll("use")).map(
		(el) => el.getAttribute("xlink:href") ?? "",
	);
}

test("renders a single button with both icons and both labels always present", () => {
	render(<ThemeToggle />);

	const buttons = screen.getAllByRole("button");
	expect(buttons).toHaveLength(1);
	expect(iconHrefs(buttons[0] as Element)).toEqual([
		"/theme-sprite.svg#dtcg-ed-icon-sun",
		"/theme-sprite.svg#dtcg-ed-icon-moon",
	]);
	expect(buttons[0]?.textContent).toContain("Switch to dark theme");
	expect(buttons[0]?.textContent).toContain("Switch to light theme");
});

test("clicking activates the opposite of the effective theme (light -> dark)", () => {
	effectiveTheme = "light";
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button"));

	expect(activateTheme).toHaveBeenCalledOnce();
	expect(activateTheme).toHaveBeenCalledWith("dark");
});

test("clicking activates the opposite of the effective theme (dark -> light)", () => {
	effectiveTheme = "dark";
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button"));

	expect(activateTheme).toHaveBeenCalledOnce();
	expect(activateTheme).toHaveBeenCalledWith("light");
});

test("with no override set but the OS preferring dark, clicking switches to light", () => {
	// The regression this guards: reading `data-theme` directly would see
	// nothing, assume light, and ask for dark — which is already on screen, so
	// the click would clear the (absent) override and appear to do nothing.
	document.documentElement.removeAttribute("data-theme");
	effectiveTheme = "dark";
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button"));

	expect(activateTheme).toHaveBeenCalledWith("light");
});

test("the tooltip describes what the click will do, from the effective theme", () => {
	effectiveTheme = "dark";
	render(<ThemeToggle />);

	expect(screen.getByRole("button")).toHaveProperty(
		"title",
		"Switch to light theme",
	);
});

test("the tooltip follows a live OS-preference change, which never touches the DOM", () => {
	effectiveTheme = "light";
	render(<ThemeToggle />);
	expect(screen.getByRole("button")).toHaveProperty(
		"title",
		"Switch to dark theme",
	);

	// The OS flipped to dark. No override is set, so CSS repaints on its own
	// and `data-theme` never changes — only the subscription can catch this.
	effectiveTheme = "dark";
	notifyEffectiveThemeChange?.();

	expect(screen.getByRole("button")).toHaveProperty(
		"title",
		"Switch to light theme",
	);
});

test("unsubscribes on unmount", () => {
	const { unmount } = render(<ThemeToggle />);

	expect(unsubscribe).not.toHaveBeenCalled();
	unmount();
	expect(unsubscribe).toHaveBeenCalledOnce();
});
