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

test("with no data-theme set (default/light), the accessible name is 'Switch to dark theme'", async () => {
	document.documentElement.removeAttribute("data-theme");
	const { getByRole } = render(<ThemeToggle />);

	expect(getByRole("button")).toHaveAccessibleName("Switch to dark theme");
});

test("with data-theme=dark, the accessible name is 'Switch to light theme'", async () => {
	document.documentElement.setAttribute("data-theme", "dark");
	try {
		const { getByRole } = render(<ThemeToggle />);
		expect(getByRole("button")).toHaveAccessibleName("Switch to light theme");
	} finally {
		document.documentElement.removeAttribute("data-theme");
	}
});
