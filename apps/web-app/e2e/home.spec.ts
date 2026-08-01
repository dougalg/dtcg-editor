import { expect, test } from "@playwright/test";
import { runAxe } from "./support/axe.ts";

test("the folder overview page has no WCAG 2.2 AA violations", async ({
	page,
}) => {
	await page.goto("/");

	const results = await runAxe(page);

	expect(results.violations).toEqual([]);
});
