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

/** SC-001 / SC-006 target: an edit is "visible" within ~100 ms (spec §Assumptions). */
const ECHO_BUDGET_MS = 100;
/** CI safety margin on the raw budget, sanctioned by C-MB-1 ("100 ms with a documented CI safety margin"). */
const CI_MARGIN = 3;
/** Steady-state value-edit commits A1 measures for long tasks (after a warm-up). */
const A1_COMMITS = 12;

const HUB = "token-group-0.sub-0.token-0";
const HUB_REFERRER = "token-group-0.sub-0.token-1";
const PLAIN = "token-_showcase.dimension";

test.describe("editing-perf — large fixture", () => {
	test("committing a value edit never blocks the main thread past the 100ms budget, with no spinner (A1)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const row = page.getByTestId(PLAIN);
		const valueInput = row.getByRole("spinbutton", { name: "Value" });
		await expect(valueInput).toBeVisible();

		// SC-001: "in ≥95% of value-edit commits the updated value is visible
		// within 100 ms of commit". With the local-draft architecture the typed
		// value is on screen immediately; what could regress is the *commit*
		// freezing the main thread (the pre-change code re-rendered all ~2,000
		// rows synchronously on every edit, ~354 ms). So: watch the Long Tasks
		// API — a main-thread block > 50 ms — across a run of real commits, and
		// require none over the budget. This measures in-page only; Playwright's
		// `fill` / `blur` protocol time never enters it.
		//
		// One warm-up commit first: the very first commit of a session costs
		// ~160 ms on this fixture (one-time JIT + `buildReverseDeps` / preview
		// cache construction over ~2,000 tokens) — amortised, not "≥95% of
		// commits". The observer starts *after* it, so it measures steady state.
		await valueInput.fill("199");
		await valueInput.blur();
		await expect(valueInput).toHaveValue("199");

		await page.evaluate(() => {
			const w = window as unknown as { __longTasks: number[] };
			w.__longTasks = [];
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					w.__longTasks.push(entry.duration);
				}
			}).observe({ type: "longtask", buffered: false });
		});

		for (let i = 0; i < A1_COMMITS; i++) {
			const next = String(200 + i);
			await valueInput.fill(next);
			await valueInput.blur();
			await expect(valueInput).toHaveValue(next);
		}
		await page.waitForTimeout(300); // let any trailing long task surface

		const longTasks = await page.evaluate(
			() => (window as unknown as { __longTasks: number[] }).__longTasks,
		);
		const longestBlockMs = longTasks.length > 0 ? Math.max(...longTasks) : 0;

		testInfo.annotations.push({
			type: "perf",
			description: `A1 ${A1_COMMITS} steady-state commits: ${longTasks.length} long task(s), longest ${Math.round(longestBlockMs)}ms (budget ${ECHO_BUDGET_MS}ms)`,
		});

		// Steady state is a clean 0 — no CI margin needed on the raw 100 ms budget.
		expect(longestBlockMs).toBeLessThanOrEqual(ECHO_BUDGET_MS);

		// SC-001 also: "no spinner / skeleton / disabled-greyed state appears for
		// the edit at any point" — scoped to the edited row (the Save button
		// outside it legitimately enables).
		await expect(row.getByRole("progressbar")).toHaveCount(0);
		const busyOrDisabled = await row.evaluate(
			(el) =>
				el.querySelector(
					'[aria-busy="true"], :disabled, [aria-disabled="true"]',
				) !== null,
		);
		expect(busyOrDisabled).toBe(false);
	});

	test("editing a token referenced by >=100 others updates every referrer within budget, no tree rebuild (A5)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const hubRow = page.getByTestId(HUB);
		const hubValue = hubRow.getByRole("spinbutton", { name: "Value" });
		await expect(hubValue).toBeVisible();
		// Precondition: the hub really has ≥100 in-file referrers.
		await expect(hubRow.getByText(/referenced \d{3,} times/)).toBeVisible();

		// The referrer row shows the hub's *resolved* value as a navigable link
		// (a `dimension` has no `Preview`, so the literal renders as JSON text).
		const referrerLink = page.getByTestId(HUB_REFERRER).getByRole("link");
		const before = (await referrerLink.textContent()) ?? "";
		expect(before).toMatch(/\{"value":\d+,"unit":"px"\}/);

		// A distant, unrelated row — its DOM node must survive the commit intact
		// (SC-005: "the tree does not visibly rebuild").
		const distantBefore = await page.getByTestId(PLAIN).elementHandle();

		const elapsed = await measureCommitToVisible(page, {
			field: hubValue,
			newValue: "321",
			readFrom: referrerLink,
			readAs: "text",
			changesFrom: before,
		});

		testInfo.annotations.push({
			type: "perf",
			description: `A5 hub edit → referrer preview updates: ${Number.isFinite(elapsed) ? `${Math.round(elapsed)}ms` : ">2000ms (not observed)"} (budget ${ECHO_BUDGET_MS}ms ×${CI_MARGIN} margin)`,
		});

		// SC-005: the referrer reflects the edit within the same 100 ms budget…
		expect(elapsed).toBeLessThanOrEqual(ECHO_BUDGET_MS * CI_MARGIN);
		// …and it shows the *new* resolved value…
		await expect(referrerLink).toHaveText(/\{"value":321,"unit":"px"\}/);
		// …and the tree did not rebuild (the distant row is the same live node).
		const distantSurvived = await distantBefore?.evaluate(
			(el) =>
				el.isConnected &&
				el ===
					document.querySelector('[data-testid="token-_showcase.dimension"]'),
		);
		expect(distantSurvived).toBe(true);
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
