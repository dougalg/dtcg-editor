import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";

vi.mock("../../hooks/useTheme.ts", () => ({
	useTheme: () => ({ activateTheme: vi.fn() }),
}));

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<ThemeToggle />);
	await expectNoViolations(container);
});

test("with no data-theme set (default/light), only the 'switch to dark' button is visible/focusable", async () => {
	// Real CSS applies in this browser-mode test (unlike the jsdom unit
	// tests), so `display: none` from ThemeToggle.module.css actually takes
	// the inactive button out of the accessibility tree here.
	document.documentElement.removeAttribute("data-theme");
	const { getByRole, queryByRole } = render(<ThemeToggle />);

	const visible = getByRole("button", { name: "Switch to dark theme" });
	expect(visible).toBeVisible();
	expect(
		queryByRole("button", { name: "Switch to light theme" }),
	).not.toBeInTheDocument();
});

test("with data-theme=dark, only the 'switch to light' button is visible/focusable", async () => {
	document.documentElement.setAttribute("data-theme", "dark");
	const { getByRole, queryByRole } = render(<ThemeToggle />);

	try {
		const visible = getByRole("button", { name: "Switch to light theme" });
		expect(visible).toBeVisible();
		expect(
			queryByRole("button", { name: "Switch to dark theme" }),
		).not.toBeInTheDocument();
	} finally {
		document.documentElement.removeAttribute("data-theme");
	}
});
