import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle.tsx";

const activateTheme = vi.fn();

vi.mock("../../hooks/useTheme.ts", () => ({
	useTheme: () => ({ activateTheme }),
}));

beforeEach(() => {
	document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
	cleanup();
	activateTheme.mockClear();
	document.documentElement.removeAttribute("data-theme");
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

test("clicking reads the current data-theme attribute and activates the opposite (light -> dark)", () => {
	document.documentElement.setAttribute("data-theme", "light");
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button"));
	expect(activateTheme).toHaveBeenCalledOnce();
	expect(activateTheme).toHaveBeenCalledWith("dark");
});

test("clicking reads the current data-theme attribute and activates the opposite (dark -> light)", () => {
	document.documentElement.setAttribute("data-theme", "dark");
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button"));
	expect(activateTheme).toHaveBeenCalledOnce();
	expect(activateTheme).toHaveBeenCalledWith("light");
});

test("with no data-theme attribute at all, clicking defaults to activating dark", () => {
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button"));
	expect(activateTheme).toHaveBeenCalledWith("dark");
});
