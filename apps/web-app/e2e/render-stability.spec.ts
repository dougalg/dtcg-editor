import { expect, test } from "@playwright/test";
import {
	getLayoutShiftReport,
	startLayoutShiftObserver,
} from "./support/stability.ts";

/**
 * Out-of-region layout-shift guard for the large fixture (contract C-MB-3,
 * SC-002 / SC-004). Every `layout-shift` observed during an interaction must
 * have all of its `sources` inside the actively edited field and its own
 * error slot — a shift attributed to another row, a group header, the Save
 * button, or page chrome fails.
 *
 * SKELETON (T005): the three interactions and the `startLayoutShiftObserver`
 * / `getLayoutShiftReport` wiring are in place. Expected to FAIL until the
 * feature is finished (A2 / A4 / A10 / A11) — outer-loop red.
 */

// These tests only stage edits (fill + blur), never Save, so the on-disk
// fixture is untouched — no restore needed.

function summarize(report: {
	outOfRegion: readonly { value: number; sources: readonly string[] }[];
}): string {
	return report.outOfRegion
		.map((s) => `${s.value.toFixed(4)} @ ${s.sources.join(", ")}`)
		.join(" | ");
}

test.describe("render-stability — large fixture", () => {
	test("typing + committing an edit shifts nothing outside the edited field (A2)", async ({
		page,
	}) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const row = page
			.getByRole("textbox", { name: /^token-0 name$/i })
			.first()
			.locator("xpath=ancestor::li[1]");
		const valueInput = row.getByRole("spinbutton").first();
		await expect(valueInput).toBeVisible();

		await startLayoutShiftObserver(page);
		await valueInput.fill("999");
		await valueInput.blur();
		await page.waitForTimeout(200);

		const report = await getLayoutShiftReport(page, [
			'li:has([name="token-0 name"])',
		]);
		expect(report.outOfRegion, summarize(report)).toEqual([]);
	});

	test("a full Tab / Shift+Tab pass causes no layout shift at all (A10/A11)", async ({
		page,
	}) => {
		await page.goto("/tokens/large_scale.tokens.json");
		await page.locator("body").click();

		await startLayoutShiftObserver(page);
		for (let i = 0; i < 60; i++) {
			await page.keyboard.press("Tab");
		}
		for (let i = 0; i < 60; i++) {
			await page.keyboard.press("Shift+Tab");
		}
		await page.waitForTimeout(200);

		const report = await getLayoutShiftReport(page, []);
		expect(report.total, summarize(report)).toBe(0);
	});

	test("committing an edit to the >=100-referrer token confines the shift to previews (A4)", async ({
		page,
	}) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const hubRow = page
			.getByRole("textbox", { name: /^token-0 name$/i })
			.first()
			.locator("xpath=ancestor::li[1]");
		const hubValue = hubRow.getByRole("spinbutton").first();
		await expect(hubValue).toBeVisible();

		await startLayoutShiftObserver(page);
		await hubValue.fill("777");
		await hubValue.blur();
		await page.waitForTimeout(300);

		// The edited field, its slot, and every referencing row's resolved
		// preview are the allowed region — no tree rebuild, no header move.
		const report = await getLayoutShiftReport(page, [
			'li:has([name="token-0 name"])',
			"[data-testid='resolved-preview']",
		]);
		expect(report.outOfRegion, summarize(report)).toEqual([]);
	});
});
