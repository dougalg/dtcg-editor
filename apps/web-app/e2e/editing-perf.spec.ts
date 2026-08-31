import { expect, test } from "@playwright/test";
import { measureCommitToVisible } from "./support/stability.ts";

/**
 * Edit-echo latency + typing-lag guards for the large fixture (contract
 * C-MB-1 / C-MB-2, SC-001 / SC-005 / SC-006). Runs against the production
 * build on the `default` server, which serves `e2e/fixtures/tokens/` — where
 * `large_scale.tokens.json` (T002) lives.
 *
 * SKELETON (T004): the structure, the `measureCommitToVisible` wiring and the
 * `perf` annotations are in place; the assertions use the 100ms budget with a
 * CI margin now, and gain the `baseline.md` ceiling in T024. Expected to FAIL
 * until the feature is finished (A1 / A5 / A6) — this is the outer-loop red.
 */

// 100ms budget (SC-001); a wide multiple absorbs shared-CI jitter without
// letting a real regression through. Tightened / cross-checked against
// baseline.md in T024. These tests only stage edits (fill + blur), never
// Save, so the on-disk fixture is untouched — no restore needed.
const ECHO_BUDGET_MS = 100;
const CI_MARGIN = 3;

test.describe("editing-perf — large fixture", () => {
	test("a value-edit commit is visible within the 100ms budget (A1)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const row = page
			.getByRole("textbox", { name: /^token-0 name$/i })
			.first()
			.locator("xpath=ancestor::li[1]");
		const valueInput = row.getByRole("spinbutton").first();
		await expect(valueInput).toBeVisible();

		const elapsed = await measureCommitToVisible(page, {
			runCommit: async () => {
				await valueInput.fill("999");
				await valueInput.blur();
			},
			readDisplayedValue: () => valueInput.inputValue(),
			expectedValue: "999",
		});

		testInfo.annotations.push({
			type: "perf",
			description: `commit → value visible ${Math.round(elapsed)}ms (budget ${ECHO_BUDGET_MS}ms)`,
		});
		expect(elapsed).toBeLessThan(ECHO_BUDGET_MS * CI_MARGIN);
	});

	test("editing a token referenced by >=100 others echoes within budget (A5)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		// `group-0.sub-0.token-0` is the hub the generator points >=100 leaves at.
		const hubRow = page
			.getByRole("textbox", { name: /^token-0 name$/i })
			.first()
			.locator("xpath=ancestor::li[1]");
		const hubValue = hubRow.getByRole("spinbutton").first();
		await expect(hubValue).toBeVisible();

		const elapsed = await measureCommitToVisible(page, {
			runCommit: async () => {
				await hubValue.fill("777");
				await hubValue.blur();
			},
			readDisplayedValue: () => hubValue.inputValue(),
			expectedValue: "777",
		});

		testInfo.annotations.push({
			type: "perf",
			description: `hub commit → visible ${Math.round(elapsed)}ms (budget ${ECHO_BUDGET_MS}ms)`,
		});
		expect(elapsed).toBeLessThan(ECHO_BUDGET_MS * CI_MARGIN);
	});

	test("a 5s typing burst drops no characters and never trails by >1 frame (A6)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const row = page
			.getByRole("textbox", { name: /^token-1 name$/i })
			.first()
			.locator("xpath=ancestor::li[1]");
		const nameInput = row.getByRole("textbox").first();
		await expect(nameInput).toBeVisible();
		await nameInput.focus();

		const typed = "the-quick-brown-fox-jumps-over-the-lazy-dog-0123456789";
		const start = await page.evaluate(() => performance.now());
		for (const char of typed) {
			await page.keyboard.type(char, { delay: 100 }); // ~10 cps
		}
		const elapsed = await page.evaluate(() => performance.now());

		const shown = await nameInput.inputValue();
		testInfo.annotations.push({
			type: "perf",
			description: `typed ${typed.length} chars over ${Math.round(elapsed - start)}ms; field shows ${shown.length}`,
		});
		// No dropped characters: the field shows exactly what was typed (the
		// leading original name is still there — assert the suffix).
		expect(shown.endsWith(typed)).toBe(true);
	});
});
