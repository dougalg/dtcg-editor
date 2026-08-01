import { expect, test } from "@playwright/test";
import { runAxe } from "./support/axe.ts";

test("the root error boundary fallback has no WCAG 2.2 AA violations", async ({
	page,
}) => {
	await page.goto("/error-boundary-check");

	await expect(
		page
			.getByRole("alert")
			.filter({ hasText: "An unexpected error occurred." }),
	).toBeVisible();

	const results = await runAxe(page);

	expect(results.violations).toEqual([]);
});
