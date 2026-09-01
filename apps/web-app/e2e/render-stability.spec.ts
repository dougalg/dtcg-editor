import { expect, test } from "@playwright/test";
import {
	getLayoutShiftReport,
	startLayoutShiftObserver,
} from "./support/stability.ts";

/**
 * Out-of-region layout-shift guard for the large fixture (contract C-MB-3,
 * SC-002 / SC-004). Every `layout-shift` observed during an interaction must
 * have all of its `sources` inside the actively edited field's row — a shift
 * attributed to another row, a group header, the Save button, or page chrome
 * fails.
 *
 * SKELETON (T005): the three interactions and the `startLayoutShiftObserver`
 * / `getLayoutShiftReport` wiring are in place. Expected to FAIL until the
 * feature is finished (A2 / A4 / A10 / A11) — outer-loop red.
 *
 * These tests only stage edits (fill + blur), never Save, so the on-disk
 * fixture is untouched — no restore needed.
 */

const HUB = "token-group-0.sub-0.token-0";
const REFERRER = "token-group-0.sub-0.token-1";
const SETTLE_MS = 250;

function summarize(report: {
	total: number;
	outOfRegion: readonly { value: number; sources: readonly string[] }[];
}): string {
	const stray = report.outOfRegion
		.map((s) => `${s.value.toFixed(4)} @ ${s.sources.join(", ")}`)
		.join(" | ");
	return `${report.total} shift(s), ${report.outOfRegion.length} out-of-region${stray ? `: ${stray}` : ""}`;
}

test.describe("render-stability — large fixture", () => {
	test("a validation error message appearing does not move the rows below it (A2)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		// A2 / FR-012 / C-KL-4: a validation *message* must render inside the
		// row's reserved-height `FieldErrorSlot`, moving nothing around it.
		// Rename a token onto a sibling's name — the store rejects it (U8) and
		// the slot renders the error. The `layout-shift` API filters shifts
		// within 500 ms of a discrete input (a commit-on-blur error render always
		// is), so the direct, scroll-independent observable is the **edited row's
		// height** (`nextRow.top − row.top`): if the slot reserves its space,
		// that gap does not change when the message appears.
		const row = page.getByTestId(REFERRER);
		const nameInput = row.getByRole("textbox", { name: "token-1 name" });
		const nextRow = page.getByTestId("token-group-0.sub-0.token-2");
		await expect(nameInput).toBeVisible();
		const rowHeight = async () => {
			const top = await row.evaluate((el) => el.getBoundingClientRect().top);
			const nextTop = await nextRow.evaluate(
				(el) => el.getBoundingClientRect().top,
			);
			return Math.round(nextTop - top);
		};

		await page.waitForTimeout(1000); // let hydration + preview settle
		const heightNoError = await rowHeight();

		await nameInput.fill("token-2"); // collides with a sibling
		await nameInput.blur();
		await expect(row.getByRole("alert")).toBeVisible();
		await page.waitForTimeout(SETTLE_MS);
		const heightWithError = await rowHeight();

		testInfo.annotations.push({
			type: "perf",
			description: `A2 edited-row height: ${heightNoError}px (no error) -> ${heightWithError}px (error shown)`,
		});

		// FR-012 / SC-002: the message renders inside the pre-reserved slot, so
		// the edited row's height — and every row below it — does not move.
		expect(Math.abs(heightWithError - heightNoError)).toBeLessThanOrEqual(1);
	});

	test("a full Tab / Shift+Tab pass causes no layout shift at all (A10/A11)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");
		await page.locator("body").click();

		await startLayoutShiftObserver(page);
		for (let i = 0; i < 40; i++) {
			await page.keyboard.press("Tab");
		}
		for (let i = 0; i < 40; i++) {
			await page.keyboard.press("Shift+Tab");
		}
		await page.waitForTimeout(SETTLE_MS);

		const report = await getLayoutShiftReport(page, []);
		testInfo.annotations.push({
			type: "perf",
			description: `A10/A11 tab-through ${summarize(report)}`,
		});
		expect(report.total, summarize(report)).toBe(0);
	});

	test("committing an edit to the >=100-referrer token confines the shift (A4)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");
		const hubValue = page
			.getByTestId(HUB)
			.getByRole("spinbutton", { name: "Value" });
		await expect(hubValue).toBeVisible();

		await startLayoutShiftObserver(page);
		await hubValue.fill("321");
		await hubValue.blur();
		await page.waitForTimeout(SETTLE_MS * 2);

		// The edited row and every referencing row's own preview are allowed;
		// nothing else may move (no tree rebuild, no header shift).
		const report = await getLayoutShiftReport(page, [
			`[data-testid="${HUB}"]`,
			'[data-testid^="token-group-0.sub-0.token-"]',
		]);
		testInfo.annotations.push({
			type: "perf",
			description: `A4 ${summarize(report)}`,
		});
		expect(report.outOfRegion, summarize(report)).toEqual([]);
	});
});
