import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle.tsx";

const toggleTheme = vi.fn();
let mockTheme: "light" | "dark" = "light";

vi.mock("../../hooks/useTheme.ts", () => ({
	useTheme: () => ({ theme: mockTheme, toggleTheme }),
}));

afterEach(() => {
	cleanup();
	toggleTheme.mockClear();
	mockTheme = "light";
});

function iconHref(container: Element): string | null {
	return container.querySelector("use")?.getAttribute("xlink:href") ?? null;
}

test("renders the sun icon, unchecked, with a 'switch to dark' label when theme is light", () => {
	mockTheme = "light";
	render(<ThemeToggle />);

	const control = screen.getByRole("switch", { name: "Switch to dark theme" });
	expect(control.getAttribute("aria-checked")).toBe("false");
	expect(iconHref(control.closest("body") as Element)).toBe(
		"/theme-sprite.svg#dtcg-ed-icon-sun",
	);
});

test("renders the moon icon, checked, with a 'switch to light' label when theme is dark", () => {
	mockTheme = "dark";
	render(<ThemeToggle />);

	const control = screen.getByRole("switch", { name: "Switch to light theme" });
	expect(control.getAttribute("aria-checked")).toBe("true");
	expect(iconHref(control.closest("body") as Element)).toBe(
		"/theme-sprite.svg#dtcg-ed-icon-moon",
	);
});

test("clicking calls toggleTheme", () => {
	mockTheme = "light";
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("switch"));
	expect(toggleTheme).toHaveBeenCalledTimes(1);
});
