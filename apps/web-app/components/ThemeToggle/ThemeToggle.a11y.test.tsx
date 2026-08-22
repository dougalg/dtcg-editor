import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";

vi.mock("../../hooks/useTheme.ts", () => ({
	useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
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

test("exposes role=switch with a correct aria-checked and accessible name", async () => {
	const { getByRole } = render(<ThemeToggle />);
	const control = getByRole("switch", { name: "Switch to dark theme" });
	expect(control.getAttribute("aria-checked")).toBe("false");
});
