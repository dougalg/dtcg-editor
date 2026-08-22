import { expect, test } from "@playwright/test";
import { runAxe } from "./support/axe.ts";

async function hasVisibleFocusIndicator(
	locator: import("@playwright/test").Locator,
) {
	return locator.evaluate((el) => {
		const style = getComputedStyle(el);
		return style.outlineStyle !== "none" || style.boxShadow !== "none";
	});
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		window.localStorage.removeItem("dtcg-ed-theme-preference");
	});
});

test("is keyboard-reachable, keyboard-operable, and shows a visible focus ring", async ({
	page,
}) => {
	await page.goto("/");

	const toggle = page.getByRole("switch");
	await page.keyboard.press("Tab");
	await expect(toggle).toBeFocused();
	expect(await hasVisibleFocusIndicator(toggle)).toBe(true);

	const initiallyChecked = await toggle.getAttribute("aria-checked");
	await page.keyboard.press(" ");
	await expect(toggle).toHaveAttribute(
		"aria-checked",
		initiallyChecked === "true" ? "false" : "true",
	);

	const html = page.locator("html");
	await expect(html).toHaveAttribute(
		"data-theme",
		initiallyChecked === "true" ? "light" : "dark",
	);
});

test("the accessible name always describes what activating it will do next", async ({
	page,
}) => {
	await page.goto("/");
	const toggle = page.getByRole("switch");

	await expect(toggle).toHaveAttribute("data-state", "unchecked");
	await expect(toggle).toHaveAccessibleName("Switch to dark theme");

	await toggle.click();
	await expect(toggle).toHaveAttribute("data-state", "checked");
	await expect(toggle).toHaveAccessibleName("Switch to light theme");
});

test("the toggle is present and the page has no WCAG 2.2 AA violations with it visible", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByRole("switch")).toBeVisible();

	const results = await runAxe(page);
	expect(results.violations).toEqual([]);
});
