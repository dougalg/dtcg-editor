import { expect, test } from "@playwright/test";
import { getLongTasks, startLongTaskObserver } from "./support/stability.ts";

/**
 * A18 (SC-004): typing a burst into the open reference picker against a
 * large candidate catalogue records no main-thread Long Task > 50ms.
 *
 * Runs under the "default" Playwright project — `large_scale.tokens.json`
 * (feature 010's own perf fixture, `editing-perf.spec.ts`) already has
 * ≥2,000 token paths, comfortably over the 1,000-path threshold, and its
 * `group-0.sub-0.token-1` is already reference-valued (`{hub}`), so no
 * dedicated fixture set is needed — see edit-token-references.spec.ts's own
 * header comment for why *that* spec instead needs the token-references
 * project's fixtures (broken/circular/multiply-defined shapes this large,
 * generated fixture doesn't have).
 */

const REFERENCE_TOKEN = "token-group-0.sub-0.token-1";
/** Same Long Task threshold as editing-perf.spec.ts / the spec's own SC-004. */
const LONG_TASK_BUDGET_MS = 50;

test.describe("edit-token-references-perf — large fixture (A18)", () => {
	// biome-ignore lint/correctness/noEmptyPattern: Playwright's own fixture-destructuring convention for accessing testInfo alone
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name !== "default",
			"runs only against the default fixture server (large_scale.tokens.json)",
		);
	});

	test("typing a burst into the open picker records no Long Task over the budget (A18)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");

		const trigger = page
			.getByTestId(REFERENCE_TOKEN)
			.getByRole("combobox", { name: /repoint reference for/i });
		await expect(trigger).toBeVisible();
		await trigger.click();

		const search = page.getByRole("combobox", { name: /search tokens/i });
		await expect(search).toBeVisible();
		// A18 is about typing into the *open* picker, not the one-off initial
		// catalogue fetch (FR-023's own loading state, a separate concern) —
		// wait for that fetch to resolve and the full list to render before
		// measuring, or its arrival mid-keystroke would attribute a one-time
		// network+parse cost to the typing budget.
		await expect(page.getByText(/loading tokens/i)).toHaveCount(0);
		// `getByRole("option")` alone would also match this page's many native
		// `<select>` colour-space dropdowns' own (hidden) `<option>`s — every
		// candidate's `displayPath` is a dotted path, which no colour-space
		// name is, so filtering by that disambiguates.
		await expect(
			page.getByRole("option", { name: /\./ }).first(),
		).toBeVisible();
		await search.focus();

		await startLongTaskObserver(page);

		// A burst: type a realistic query character by character (the
		// keystroke pattern the budget is about), not a single `.fill`, which
		// would collapse the whole burst into one DOM write.
		await page.keyboard.type("token-0", { delay: 20 });

		const longTasks = await getLongTasks(page);
		const worst = longTasks.length > 0 ? Math.max(...longTasks) : 0;

		testInfo.annotations.push({
			type: "perf",
			description: `A18: ${longTasks.length} long tasks while typing, worst ${worst.toFixed(1)}ms (budget ${LONG_TASK_BUDGET_MS}ms)`,
		});

		expect(
			longTasks.filter((d) => d > LONG_TASK_BUDGET_MS),
			`long tasks over budget: ${longTasks.filter((d) => d > LONG_TASK_BUDGET_MS).join(", ")}ms`,
		).toEqual([]);
	});
});
