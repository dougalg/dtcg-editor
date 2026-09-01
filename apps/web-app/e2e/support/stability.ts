import type { Locator, Page } from "@playwright/test";

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
 * Starts an in-page `PerformanceObserver('longtask')` that records the
 * `duration` of every main-thread block > 50 ms. Call once after `page.goto`,
 * before the interaction under test. Mirrors `startLayoutShiftObserver`; used by
 * the A1 (commit) and A6 (typing burst) guards to catch a per-keystroke or
 * per-commit full-tree re-render regression.
 */
export async function startLongTaskObserver(page: Page): Promise<void> {
	await page.evaluate(() => {
		const store = window as unknown as { __longTasks?: number[] };
		store.__longTasks = [];
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				store.__longTasks?.push(entry.duration);
			}
		}).observe({ type: "longtask", buffered: false });
	});
}

/** Reads back the long-task durations (ms) collected since `startLongTaskObserver`. */
export async function getLongTasks(page: Page): Promise<number[]> {
	return page.evaluate(
		() => (window as unknown as { __longTasks?: number[] }).__longTasks ?? [],
	);
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
 * U71a — measures `commit → value visible` with the **whole timed span running
 * in-page**: one `page.evaluate` that reads `performance.now()`, dispatches a
 * real commit on `field` (native value setter + `input` / `change` / `blur`, so
 * the app's own React handlers run), then `requestAnimationFrame`-polls the
 * displayed value until it reflects the edit, then reads `performance.now()`
 * again. The returned delta therefore excludes Playwright↔browser protocol
 * round-trips — the wall-clock version (U71, superseded) folded `fill` / `blur`
 * and every poll read, each a CDP round-trip, into its number.
 *
 * The displayed value is read from `readFrom` (default: `field` itself) as its
 * `.value` (`readAs: "value"`, an input) or `.textContent` (`readAs: "text"`).
 * Provide exactly one target: `becomes` (poll until the displayed value equals
 * it) or `changesFrom` (poll until it differs from it — for a referrer row
 * whose resolved text form isn't known up front).
 *
 * Returns `Number.POSITIVE_INFINITY` if the value has not appeared within
 * `timeoutMs` (rather than throwing) so a caller can still annotate the miss
 * and let its own budget assertion fail on it.
 */
export async function measureCommitToVisible(
	page: Page,
	options: {
		field: Locator;
		newValue: string;
		readFrom?: Locator;
		readAs?: "value" | "text";
		becomes?: string;
		changesFrom?: string;
		timeoutMs?: number;
	},
): Promise<number> {
	const fieldHandle = await options.field.elementHandle();
	const readHandle = await (options.readFrom ?? options.field).elementHandle();
	if (fieldHandle === null || readHandle === null) {
		return Number.POSITIVE_INFINITY;
	}
	return page.evaluate(
		async ({
			field,
			readEl,
			newValue,
			readAs,
			becomes,
			changesFrom,
			timeoutMs,
		}) => {
			const readDisplayed = (): string =>
				readAs === "text"
					? (readEl.textContent ?? "")
					: (readEl as HTMLInputElement).value;
			const matches = (displayed: string): boolean =>
				becomes !== undefined
					? displayed === becomes
					: displayed !== changesFrom;
			const nextFrame = (): Promise<void> =>
				new Promise((resolve) => {
					requestAnimationFrame(() => resolve());
				});

			const input = field as HTMLInputElement | HTMLTextAreaElement;
			const prototype =
				input instanceof HTMLTextAreaElement
					? HTMLTextAreaElement.prototype
					: HTMLInputElement.prototype;
			const valueSetter = Object.getOwnPropertyDescriptor(
				prototype,
				"value",
			)?.set;

			const start = performance.now();
			input.focus();
			valueSetter?.call(input, newValue);
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
			input.blur();

			const deadline = start + timeoutMs;
			while (performance.now() < deadline) {
				if (matches(readDisplayed())) {
					return performance.now() - start;
				}
				await nextFrame();
			}
			return Number.POSITIVE_INFINITY;
		},
		{
			field: fieldHandle,
			readEl: readHandle,
			newValue: options.newValue,
			readAs: options.readAs ?? "value",
			becomes: options.becomes,
			changesFrom: options.changesFrom,
			timeoutMs: options.timeoutMs ?? 2000,
		},
	);
}
