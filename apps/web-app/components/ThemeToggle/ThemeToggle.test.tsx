import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle.tsx";

const activateTheme = vi.fn();

vi.mock("../../hooks/useTheme.ts", () => ({
	useTheme: () => ({ activateTheme }),
}));

afterEach(() => {
	cleanup();
	activateTheme.mockClear();
});

function iconHref(el: Element): string | null {
	return el.querySelector("use")?.getAttribute("xlink:href") ?? null;
}

test("renders both buttons unconditionally, each with the correct icon and static label", () => {
	render(<ThemeToggle />);

	const toDark = screen.getByRole("button", { name: "Switch to dark theme" });
	expect(iconHref(toDark)).toBe("/theme-sprite.svg#dtcg-ed-icon-sun");

	const toLight = screen.getByRole("button", {
		name: "Switch to light theme",
	});
	expect(iconHref(toLight)).toBe("/theme-sprite.svg#dtcg-ed-icon-moon");
});

test("clicking the 'switch to dark' button calls activateTheme('dark')", () => {
	render(<ThemeToggle />);

	fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
	expect(activateTheme).toHaveBeenCalledOnce();
	expect(activateTheme).toHaveBeenCalledWith("dark");
});

test("clicking the 'switch to light' button calls activateTheme('light')", () => {
	render(<ThemeToggle />);

	fireEvent.click(
		screen.getByRole("button", { name: "Switch to light theme" }),
	);
	expect(activateTheme).toHaveBeenCalledOnce();
	expect(activateTheme).toHaveBeenCalledWith("light");
});
