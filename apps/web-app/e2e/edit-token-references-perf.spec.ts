import type { ElementHandle, Page } from "@playwright/test";
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
/** SC-004: "keystroke-to-updated-list latency stays under 50ms at p95". */
const P95_LATENCY_BUDGET_MS = 50;

/**
 * Times one keystroke end to end: appends `char` to the search field's value
 * (via the native value setter, the same trick `measureCommitToVisible`
 * uses in `support/stability.ts`, kept local since this is the only spec
 * that needs it), then waits two consecutive animation frames — the
 * standard "give the browser a full paint cycle" signal, since polling for
 * a *specific* DOM change (e.g. the live region's announced text) breaks
 * down exactly when React legitimately has nothing new to paint (two
 * keystrokes in a row that both match zero candidates render identical
 * text, so "wait for a change" would falsely count the still-fast case as
 * a multi-hundred-ms stall — tried first, then replaced with this after
 * that showed up in the sample data). T057, verification.md Finding 2: the
 * existing A18 test only bounds the Long-Task *ceiling*, not this p95
 * *latency*, which the pure-function `candidate-filter.bench.ts` doesn't
 * measure either since it never renders.
 */
async function timeKeystroke(
	page: Page,
	fieldHandle: ElementHandle<HTMLElement | SVGElement>,
	nextValue: string,
): Promise<number> {
	return page.evaluate(
		({ field, nextValue: value }) => {
			const input = field as HTMLInputElement;
			const setter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			const start = performance.now();
			setter?.call(input, value);
			input.dispatchEvent(new Event("input", { bubbles: true }));
			return new Promise<number>((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => resolve(performance.now() - start));
				});
			});
		},
		{ field: fieldHandle, nextValue },
	);
}

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

	test("keystroke-to-updated-list latency stays under budget at p95 (SC-004)", async ({
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
		await expect(page.getByText(/loading tokens/i)).toHaveCount(0);
		await expect(
			page.getByRole("option", { name: /\./ }).first(),
		).toBeVisible();

		const fieldHandle = await search.elementHandle();
		expect(fieldHandle).not.toBeNull();
		if (fieldHandle === null) {
			return;
		}

		// A burst long enough for a real p95: "token-100" narrows through
		// real, shrinking match sets (the expensive case), then a nonsense
		// tail keeps typing past the point where nothing matches (the cheap
		// case) — together a realistic mix, not just the easy tail.
		const burst = "token-100-not-a-real-suffix-at-all";
		const latencies: number[] = [];
		let value = "";
		for (const char of burst) {
			value += char;
			latencies.push(await timeKeystroke(page, fieldHandle, value));
		}

		const sorted = [...latencies].sort((a, b) => a - b);
		const p95Index = Math.min(
			sorted.length - 1,
			Math.floor(sorted.length * 0.95),
		);
		const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;
		const worst = sorted[sorted.length - 1] ?? 0;

		testInfo.annotations.push({
			type: "perf",
			description: `SC-004: p95 ${p95.toFixed(1)}ms, worst ${worst.toFixed(1)}ms over ${latencies.length} keystrokes (budget ${P95_LATENCY_BUDGET_MS}ms)`,
		});

		expect(
			p95,
			`p95 keystroke latency ${p95.toFixed(1)}ms over samples: ${latencies.map((n) => n.toFixed(1)).join(", ")}`,
		).toBeLessThan(P95_LATENCY_BUDGET_MS);
	});
});
