import { expect, test } from "@playwright/test";
import { runAxe } from "./support/axe.ts";

test("a token file page has no WCAG 2.2 AA violations", async ({ page }) => {
	await page.goto("/tokens/spacing_scale.tokens.json");

	const results = await runAxe(page);

	expect(results.violations).toEqual([]);
});
