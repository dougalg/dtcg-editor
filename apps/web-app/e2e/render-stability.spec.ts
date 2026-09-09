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
		// the slot renders the error. SC-002's literal metric is "measured
		// layout shift … is zero", but the `layout-shift` API sets
		// `hadRecentInput` on (and thus discards) any shift within 500 ms of a
		// discrete input — and a commit-on-blur error render always is one. So
		// SC-002 is measured here by the direct, scroll-independent observable:
		// the **edited row's height** (`nextRow.top − row.top`). If the slot
		// reserves its space, that gap does not change when the message appears.
		// (Rationale recorded in `tdd/cycle-log.md` cycle 88.)
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

	test("a full Tab / Shift+Tab pass causes no layout shift at all (supports A3 / SC-003)", async ({
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
			description: `tab-through ${summarize(report)}`,
		});
		expect(report.total, summarize(report)).toBe(0);
	});

	test("committing an edit partway down the tree does not move the scroll position (A10)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		// Scroll ~1,500 px past the fold, edit the hub row's *description*
		// (uncontrolled, no reference/collision side effects), commit it, and
		// confirm neither the window scroll nor the visible rows moved
		// (FR-003 / C-RI-5). The hub (`token-0`) is one of the few non-reference
		// rows in `sub-0`, so it has a description field.
		const ROW = "token-group-0.sub-0.token-0";
		const row = page.getByTestId(ROW);
		await row.scrollIntoViewIfNeeded();
		await page.waitForTimeout(SETTLE_MS);

		const description = row.getByRole("textbox", { name: /description/i });
		await description.focus();

		const measure = () =>
			page.evaluate((id) => {
				const el = document.querySelector(`[data-testid="${id}"]`);
				return {
					scrollY: window.scrollY,
					rowTop: Math.round(el?.getBoundingClientRect().top ?? Number.NaN),
				};
			}, ROW);

		const before = await measure();

		await description.fill("A10 scroll-stability note");
		await description.blur();
		await page.waitForTimeout(SETTLE_MS * 2);

		const after = await measure();

		testInfo.annotations.push({
			type: "perf",
			description: `A10 scrollY ${before.scrollY}->${after.scrollY}, row top ${before.rowTop}->${after.rowTop}`,
		});

		expect(after.scrollY).toBe(before.scrollY);
		expect(Math.abs(after.rowTop - before.rowTop)).toBeLessThanOrEqual(1);
	});

	test("committing an edit in a ≥1,000-token doc changes only the edited row and its referrers (A4)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");
		const hubRow = page.getByTestId(HUB);
		const hubValue = hubRow.getByRole("spinbutton", { name: "Value" });
		await expect(hubValue).toBeVisible();
		await page.waitForTimeout(1000); // hydration + preview settle

		// SC-004's literal metric is "measured layout shift … is zero", but the
		// `layout-shift` API discards any shift within 500 ms of a discrete input
		// (`hadRecentInput`) and a commit-on-blur always is one. So the confinement
		// is measured directly instead: an `innerHTML` DOM-diff of the unrelated
		// rows / group headers / `<details open>` flags / back-link, which is
		// stricter (byte equality, not just "no visible shift").
		// (Rationale recorded in `tdd/cycle-log.md` cycle 91.)

		// `_showcase.color` / `_showcase.exotic` do not reference the hub — their
		// rendered markup must be byte-identical across the commit, and their DOM
		// node must not be remounted. A referrer (`token-1`) must change.
		const UNRELATED = ["token-_showcase.color", "token-_showcase.exotic"];
		const REFERRER = "token-group-0.sub-0.token-1";

		const snapshot = () =>
			page.evaluate(
				({ unrelated, referrer }) => {
					const html = (id: string) =>
						document.querySelector(`[data-testid="${id}"]`)?.innerHTML ??
						"(missing)";
					const backLink = document.querySelector("a");
					return {
						unrelated: unrelated.map((id) => html(id)),
						referrerText:
							document
								.querySelector(`[data-testid="${referrer}"]`)
								?.textContent?.replace(/\s+/g, " ")
								.trim() ?? "",
						// group headers + page chrome: text and document-relative Y
						groupSummaries: Array.from(
							document.querySelectorAll("details > summary"),
						)
							.slice(0, 6)
							.map((s) => (s as HTMLElement).innerText.trim()),
						detailsOpen: Array.from(document.querySelectorAll("details"))
							.slice(0, 8)
							.map((d) => (d as HTMLDetailsElement).open),
						backLinkText: backLink?.textContent?.trim() ?? "",
						backLinkDocY: backLink
							? Math.round(
									backLink.getBoundingClientRect().top + window.scrollY,
								)
							: -1,
					};
				},
				{ unrelated: UNRELATED, referrer: REFERRER },
			);

		const before = await snapshot();
		const unrelatedNodeBefore = await page
			.getByTestId(UNRELATED[0] as string)
			.elementHandle();

		await hubValue.fill("321");
		await hubValue.blur();
		await expect(hubValue).toHaveValue("321");
		await page.waitForTimeout(SETTLE_MS * 2);

		const after = await snapshot();
		const unrelatedNodeSurvived = await unrelatedNodeBefore?.evaluate(
			(el) =>
				el.isConnected &&
				el === document.querySelector('[data-testid="token-_showcase.color"]'),
		);

		testInfo.annotations.push({
			type: "perf",
			description: `A4 unrelated-html-changed ${before.unrelated.map((h, i) => (h === after.unrelated[i] ? 0 : 1)).join("")}, referrer-changed ${before.referrerText !== after.referrerText}, node-survived ${unrelatedNodeSurvived}, backLinkDocY ${before.backLinkDocY}->${after.backLinkDocY}`,
		});

		// SC-004: the change is confined to the edited row + referrers…
		expect(after.unrelated).toEqual(before.unrelated);
		expect(unrelatedNodeSurvived).toBe(true);
		// …group headers, page header, and expanded state are untouched…
		expect(after.groupSummaries).toEqual(before.groupSummaries);
		expect(after.detailsOpen).toEqual(before.detailsOpen);
		expect(after.detailsOpen.every((o) => o === true)).toBe(true);
		expect(after.backLinkText).toBe(before.backLinkText);
		expect(after.backLinkDocY).toBe(before.backLinkDocY);
		// …and the edit *did* land (not a vacuous pass): the referrer's resolved
		// preview reflects the new hub value.
		expect(after.referrerText).not.toBe(before.referrerText);
		expect(after.referrerText).toContain('"value":321');
	});
});
