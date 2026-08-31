import type { Page } from "@playwright/test";

/**
 * Measurement helpers for the perf / stability e2e specs (contract
 * `measurement-and-baseline.md`, C-MB-1 / C-MB-3).
 *
 * Both run their real work **in the page** — `layout-shift` and
 * `performance.now()` are browser concerns — with thin Node-side wrappers that
 * `page.evaluate` into it. Nothing here asserts; the specs do.
 */

export interface OutOfRegionShift {
	/** The `layout-shift` entry's score. */
	readonly value: number;
	/** A short description of each source node that fell outside the allowed
	 * region — enough to name the offending row / header / control in a
	 * failure message. */
	readonly sources: readonly string[];
}

export interface LayoutShiftReport {
	/** Every un-input-driven `layout-shift` entry seen since the observer started. */
	readonly total: number;
	/** The subset whose `sources` include at least one node outside every
	 * allowed-region selector. An empty array is the pass condition for C-MB-3. */
	readonly outOfRegion: readonly OutOfRegionShift[];
}

/**
 * U70 — starts an in-page `PerformanceObserver('layout-shift')` that keeps
 * every entry (score + the live source nodes + their prev/current rects).
 * Call once after `page.goto`, before the interaction under test.
 */
export async function startLayoutShiftObserver(page: Page): Promise<void> {
	await page.evaluate(() => {
		interface LayoutShiftSource {
			node?: Node;
			previousRect: DOMRectReadOnly;
			currentRect: DOMRectReadOnly;
		}
		interface LayoutShiftEntry extends PerformanceEntry {
			value: number;
			hadRecentInput: boolean;
			sources?: LayoutShiftSource[];
		}
		const store = window as unknown as {
			__layoutShiftEntries?: {
				value: number;
				sources: LayoutShiftSource[];
			}[];
		};
		store.__layoutShiftEntries = [];
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries() as LayoutShiftEntry[]) {
				// A shift within 500ms of a discrete user input (click, keydown)
				// is expected and excluded from CLS by the platform — mirror that.
				if (entry.hadRecentInput) {
					continue;
				}
				store.__layoutShiftEntries?.push({
					value: entry.value,
					sources: entry.sources ?? [],
				});
			}
		});
		observer.observe({ type: "layout-shift", buffered: true });
	});
}

/**
 * U70 — reads back the collected shifts and, for each, checks whether every
 * source node is contained within one of `allowedRegionSelectors` (the edited
 * field and its own error slot). The containment test runs in-page while the
 * source nodes are still live.
 */
export async function getLayoutShiftReport(
	page: Page,
	allowedRegionSelectors: readonly string[],
): Promise<LayoutShiftReport> {
	return page.evaluate((selectors) => {
		const store = window as unknown as {
			__layoutShiftEntries?: {
				value: number;
				sources: { node?: Node }[];
			}[];
		};
		const entries = store.__layoutShiftEntries ?? [];
		const allowedRoots = selectors.flatMap((selector) =>
			Array.from(document.querySelectorAll(selector)),
		);

		function describe(node: Node | undefined): string {
			if (!(node instanceof Element)) {
				return node ? node.nodeName.toLowerCase() : "(detached)";
			}
			const testId = node.getAttribute("data-testid");
			if (testId !== null) {
				return `[data-testid="${testId}"]`;
			}
			const id = node.id ? `#${node.id}` : "";
			const cls =
				typeof node.className === "string" && node.className
					? `.${node.className.trim().split(/\s+/).join(".")}`
					: "";
			return `${node.tagName.toLowerCase()}${id}${cls}`;
		}

		const outOfRegion = [];
		for (const entry of entries) {
			const stray = entry.sources
				.filter(
					(source) =>
						!source.node ||
						!allowedRoots.some((root) => root.contains(source.node as Node)),
				)
				.map((source) => describe(source.node));
			if (stray.length > 0) {
				outOfRegion.push({ value: entry.value, sources: stray });
			}
		}
		return { total: entries.length, outOfRegion };
	}, allowedRegionSelectors as string[]);
}

/**
 * U71 — measures `commit → value visible`: a `performance.now()` reading in
 * the page, then `runCommit()`, then polls `readDisplayedValue()` (a
 * `page.evaluate`d DOM read) until it returns `expectedValue`, then a second
 * `performance.now()`. Returns the delta in milliseconds.
 *
 * Throws if the value has not appeared within `timeoutMs` — a caller
 * asserting a 100ms budget should set this well above it (e.g. 2000) so a
 * miss reports the real elapsed time rather than a timeout.
 */
export async function measureCommitToVisible(
	page: Page,
	options: {
		runCommit: () => Promise<void>;
		readDisplayedValue: () => Promise<string>;
		expectedValue: string;
		timeoutMs?: number;
	},
): Promise<number> {
	const {
		runCommit,
		readDisplayedValue,
		expectedValue,
		timeoutMs = 2000,
	} = options;
	const pollMs = 8;
	const start = await page.evaluate(() => performance.now());
	await runCommit();

	for (let waited = 0; waited <= timeoutMs; waited += pollMs) {
		if ((await readDisplayedValue()) === expectedValue) {
			const end = await page.evaluate(() => performance.now());
			return end - start;
		}
		await page.waitForTimeout(pollMs);
	}
	throw new Error(
		`commit → value visible: "${expectedValue}" was not displayed within ${timeoutMs}ms`,
	);
}
