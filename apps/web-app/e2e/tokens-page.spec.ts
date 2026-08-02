import { expect, test } from "@playwright/test";
import { runAxe } from "./support/axe.ts";

test("a token file page has no WCAG 2.2 AA violations", async ({ page }) => {
	await page.goto("/tokens/spacing_scale.tokens.json");

	const results = await runAxe(page);

	expect(results.violations).toEqual([]);
});

test("a color token file page, including an out-of-range color's issue alert and the native color picker, has no WCAG 2.2 AA violations (AC-12)", async ({
	page,
}) => {
	await page.goto("/tokens/color_scale.tokens.json");

	const results = await runAxe(page);

	expect(results.violations).toEqual([]);
});
