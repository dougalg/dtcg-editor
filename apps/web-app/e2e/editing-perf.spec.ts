import { expect, test } from "@playwright/test";
import { measureCommitToVisible } from "./support/stability.ts";

/**
 * Edit-echo latency + typing-lag guards for the large fixture (contract
 * C-MB-1 / C-MB-2, SC-001 / SC-005 / SC-006). Runs against the production
 * build on the `default` server, which serves `e2e/fixtures/tokens/` — where
 * `large_scale.tokens.json` (T002) lives.
 *
 * SKELETON (T004): the interactions, the `measureCommitToVisible` wiring and
 * the `perf` annotations are in place; the assertions use the 100ms budget
 * with a CI margin now, and gain the `baseline.md` ceiling in T024. Expected
 * to FAIL until the feature is finished (A1 / A5 / A6) — outer-loop red.
 *
 * Fixture landmarks (see `scripts/generate-large-fixture.ts`):
 * - `_showcase.dimension` — a plain, editable dimension token.
 * - `group-0.sub-0.token-0` — the hub, referenced by ~131 in-file tokens.
 * - `group-0.sub-0.token-1` — one of those referencing tokens (value `{hub}`).
 */

const ECHO_BUDGET_MS = 100;
const CI_MARGIN = 3;

const HUB = "token-group-0.sub-0.token-0";
const HUB_REFERRER = "token-group-0.sub-0.token-1";
const PLAIN = "token-_showcase.dimension";

test.describe("editing-perf — large fixture", () => {
	test("a value-edit commit is visible within the 100ms budget (A1)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const valueInput = page
			.getByTestId(PLAIN)
			.getByRole("spinbutton", { name: "Value" });
		await expect(valueInput).toBeVisible();

		const elapsed = await measureCommitToVisible(page, {
			runCommit: async () => {
				await valueInput.fill("321");
				await valueInput.blur();
			},
			readDisplayedValue: () => valueInput.inputValue(),
			expectedValue: "321",
		});

		testInfo.annotations.push({
			type: "perf",
			description: `A1 commit → value visible: ${Number.isFinite(elapsed) ? `${Math.round(elapsed)}ms` : ">2000ms (not observed)"} (budget ${ECHO_BUDGET_MS}ms)`,
		});
		expect(elapsed).toBeLessThan(ECHO_BUDGET_MS * CI_MARGIN);
	});

	test("editing a token referenced by >=100 others echoes within budget (A5)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const hubValue = page
			.getByTestId(HUB)
			.getByRole("spinbutton", { name: "Value" });
		await expect(hubValue).toBeVisible();

		// The number that matters: how long until a *referencing* row's shown
		// resolved value reflects the hub edit.
		const referrerValue = page.getByTestId(HUB_REFERRER).getByText(/px$/);
		const before = (await referrerValue.textContent()) ?? "";

		const elapsed = await measureCommitToVisible(page, {
			runCommit: async () => {
				await hubValue.fill("321");
				await hubValue.blur();
			},
			readDisplayedValue: async () =>
				((await referrerValue.textContent()) ?? "") === before ? "" : "changed",
			expectedValue: "changed",
		});

		testInfo.annotations.push({
			type: "perf",
			description: `A5 hub edit → referrer preview updates: ${Number.isFinite(elapsed) ? `${Math.round(elapsed)}ms` : ">2000ms (not observed — no live ref preview)"} (budget ${ECHO_BUDGET_MS}ms)`,
		});
		expect(elapsed).toBeLessThan(ECHO_BUDGET_MS * CI_MARGIN);
	});

	test("a typing burst drops no characters (A6)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const nameInput = page
			.getByTestId(PLAIN)
			.getByRole("textbox", { name: /name$/i });
		await expect(nameInput).toBeVisible();
		const original = await nameInput.inputValue();
		await nameInput.focus();
		await page.keyboard.press("End");

		const typed = "-the-quick-brown-fox-0123456789-jumps-over-the-lazy-dog";
		const start = await page.evaluate(() => performance.now());
		for (const char of typed) {
			await page.keyboard.type(char, { delay: 100 }); // ~10 cps
		}
		const elapsedMs = (await page.evaluate(() => performance.now())) - start;

		const shown = await nameInput.inputValue();
		const dropped = original.length + typed.length - shown.length;
		testInfo.annotations.push({
			type: "perf",
			description: `A6 typing burst: ${typed.length} chars over ${Math.round(elapsedMs)}ms, ${dropped} dropped`,
		});
		expect(shown).toBe(original + typed);
	});
});
