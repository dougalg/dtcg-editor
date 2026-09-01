import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const fixturePath = fileURLToPath(
	new URL("./fixtures/tokens/spacing_scale.tokens.json", import.meta.url),
);

let originalBytes: string;

test.beforeEach(() => {
	originalBytes = readFileSync(fixturePath, "utf-8");
});

test.afterEach(() => {
	writeFileSync(fixturePath, originalBytes);
});

/** Presses Tab and asserts the given locator is exactly what received focus. */
async function tabTo(page: Page, target: Locator) {
	await page.keyboard.press("Tab");
	await expect(target).toBeFocused();
}

/** Presses Tab repeatedly (bounded) until `target` receives focus, for stretches of unrelated intermediate elements this test doesn't assert on individually. */
async function tabUntilFocused(page: Page, target: Locator, maxTabs = 200) {
	for (let i = 0; i < maxTabs; i++) {
		if (await target.evaluate((el) => el === document.activeElement)) {
			return;
		}
		await page.keyboard.press("Tab");
	}
	throw new Error(
		`"${target}" did not receive focus within ${maxTabs} Tab presses`,
	);
}

async function hasVisibleFocusIndicator(locator: Locator): Promise<boolean> {
	return locator.evaluate((el) => {
		const style = getComputedStyle(el);
		return style.outlineStyle !== "none" || style.boxShadow !== "none";
	});
}

/** What the currently focused element is, for the A3 tab-through assertions. */
async function focusedInfo(page: Page): Promise<{
	tag: string;
	isControl: boolean;
	/** document-relative Y (scroll-independent), for the visual-order check */
	docY: number;
	label: string;
}> {
	return page.evaluate(() => {
		const el = document.activeElement;
		if (el === null || el === document.body || el.tagName === "HTML") {
			return {
				tag: el ? el.tagName.toLowerCase() : "null",
				isControl: false,
				docY: -1,
				label: "(body)",
			};
		}
		const r = el.getBoundingClientRect();
		return {
			tag: el.tagName.toLowerCase(),
			isControl: el.matches(
				"a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])",
			),
			docY: Math.round(r.top + window.scrollY),
			label:
				el.getAttribute("aria-label") ??
				el.id ??
				el.textContent?.trim().slice(0, 30) ??
				el.tagName.toLowerCase(),
		};
	});
}

/**
 * For the currently focused control: is its focus ring (border box grown by
 * `outline-width` + `|outline-offset|`) cropped by any `overflow` ancestor, or
 * is its centre covered by an unrelated element? (A3a — C-KL-1 / C-KL-7 / FR-007)
 */
async function focusRingClip(page: Page): Promise<{
	clippedBy: string | null;
	obscuredBy: string | null;
	label: string;
}> {
	return page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		if (el === null || el === document.body) {
			return {
				clippedBy: "(no control focused)",
				obscuredBy: null,
				label: "(body)",
			};
		}
		const name = (n: Element) =>
			n.getAttribute("data-testid") ??
			(n as HTMLElement).id ??
			`${n.tagName.toLowerCase()}.${(n.className || "").toString().trim().split(/\s+/)[0] ?? ""}`;
		const cs = getComputedStyle(el);
		const grow =
			(Number.parseFloat(cs.outlineWidth) || 0) +
			Math.abs(Number.parseFloat(cs.outlineOffset) || 0);
		const r = el.getBoundingClientRect();
		const ring = {
			top: r.top - grow,
			bottom: r.bottom + grow,
			left: r.left - grow,
			right: r.right + grow,
		};

		let clippedBy: string | null = null;
		for (
			let a = el.parentElement;
			a && clippedBy === null;
			a = a.parentElement
		) {
			const s = getComputedStyle(a);
			const clipX = /^(hidden|clip|auto|scroll)$/.test(s.overflowX);
			const clipY = /^(hidden|clip|auto|scroll)$/.test(s.overflowY);
			if (!clipX && !clipY) continue;
			const ar = a.getBoundingClientRect();
			const inner = {
				top: ar.top + a.clientTop,
				left: ar.left + a.clientLeft,
				bottom: ar.top + a.clientTop + a.clientHeight,
				right: ar.left + a.clientLeft + a.clientWidth,
			};
			if (
				(clipY && ring.top < inner.top - 1) ||
				(clipY && ring.bottom > inner.bottom + 1) ||
				(clipX && ring.left < inner.left - 1) ||
				(clipX && ring.right > inner.right + 1)
			) {
				clippedBy = name(a);
			}
		}

		const cx = Math.round(r.left + r.width / 2);
		const cy = Math.round(r.top + r.height / 2);
		const hit = document.elementFromPoint(cx, cy);
		const obscuredBy =
			hit === null || el === hit || el.contains(hit) || hit.contains(el)
				? null
				: name(hit);

		return {
			clippedBy,
			obscuredBy,
			label: el.getAttribute("aria-label") ?? el.id ?? el.tagName.toLowerCase(),
		};
	});
}

// These two pre-existing tests use the general fixture set and run only
// under the "default" project — see the T058 describe block below for
// this feature's own controls, gated the same way in the other direction.
// A describe-scoped beforeEach, not a file-level one: this file's two
// halves run under different projects, and a file-level hook would apply
// to both, defeating each half's own gate.
test.describe("general-fixture controls", () => {
	// biome-ignore lint/correctness/noEmptyPattern: Playwright's own fixture-destructuring convention for accessing testInfo alone
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name !== "default",
			"runs only against the default fixture server",
		);
	});

	test("the browse -> open -> edit -> save flow is fully keyboard-operable with visible focus (FR-03)", async ({
		page,
	}) => {
		await page.goto("/");

		// The fixture's folder listing is alphabetical, so spacing_scale.tokens.json
		// (not color_scale.tokens.json) is guaranteed to be the first tab stop —
		// both filenames are fixed, e2e-owned content (see e2e/fixtures/tokens/),
		// so asserting on the exact name here is safe and unambiguous.
		const fileLink = page.getByRole("link", {
			name: /spacing_scale\.tokens\.json/i,
		});
		await tabUntilFocused(page, fileLink);
		expect(await hasVisibleFocusIndicator(fileLink)).toBe(true);

		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/\/tokens\/spacing_scale\.tokens\.json$/);

		const backLink = page.getByRole("link", {
			name: /back to folder overview/i,
		});
		await tabTo(page, backLink);

		const groupNameInput = page.getByRole("textbox", { name: "Group Name:" });
		await tabTo(page, groupNameInput);

		// The group-name field lives outside <details>, ahead of <summary> in
		// document order (TreeGroupNode.tsx) — not a role="button", since a
		// native <summary> disclosure has no role mapping in this Chromium
		// build's accessibility tree (see token-references.spec.ts for the
		// same finding), so it's found by its label.
		const groupToggle = page.getByLabel("Toggle spacing-scale");
		await tabTo(page, groupToggle);

		const tokenNameInput = page.getByRole("textbox", {
			name: /^0 name$/i,
		});
		await tabTo(page, tokenNameInput);

		const dimensionValueInput = page
			.getByRole("spinbutton", { name: "Value" })
			.first();
		await tabTo(page, dimensionValueInput);
		expect(await hasVisibleFocusIndicator(dimensionValueInput)).toBe(true);

		// Edit the value, keyboard-only: select the existing text, then replace it.
		await page.keyboard.press("Home");
		await page.keyboard.press("Shift+End");
		await page.keyboard.type("42");

		const dimensionUnitSelect = page
			.getByRole("combobox", { name: "Unit" })
			.first();
		await tabTo(page, dimensionUnitSelect);

		const descriptionInput = page.getByRole("textbox", {
			name: /^0 description$/i,
		});
		await tabTo(page, descriptionInput);

		const saveButton = page.getByRole("button", { name: /^save$/i });
		await tabUntilFocused(page, saveButton);
		await expect(saveButton).toBeEnabled();
		expect(await hasVisibleFocusIndicator(saveButton)).toBe(true);

		await page.keyboard.press("Enter");

		await expect(saveButton).toBeDisabled();
		const savedContents = JSON.parse(readFileSync(fixturePath, "utf-8"));
		expect(savedContents["spacing-scale"]["0"].$value.value).toBe(42);
	});

	test("the color editor's colour-space select is keyboard-reachable with an accessible name (AC-12)", async ({
		page,
	}) => {
		// Read-only: only tabs and reads focus/accessible-name, never types into or
		// saves `color_scale.tokens.json`, so this test needs no backup/restore of
		// that fixture (unlike the flow above, which edits and saves).
		await page.goto("/");

		const fileLink = page.getByRole("link", {
			name: /color_scale\.tokens\.json/i,
		});
		await tabUntilFocused(page, fileLink);
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/\/tokens\/color_scale\.tokens\.json$/);

		const tokenNameInput = page.getByRole("textbox", {
			name: /^blue-500 name$/i,
		});
		await tabUntilFocused(page, tokenNameInput);

		// Every color token on this page has its own "Colour space" select, so
		// scope to blue-500's own token `<li>` (its nearest `<li>` ancestor, not
		// the group's, which also "contains" every sibling token) rather than
		// `page.getByRole`, which would be ambiguous across the whole tree.
		const tokenListItem = tokenNameInput.locator("xpath=ancestor::li[1]");
		const spaceSelect = tokenListItem.getByRole("combobox", {
			name: "Colour space",
		});
		await tabUntilFocused(page, spaceSelect);
		expect(await hasVisibleFocusIndicator(spaceSelect)).toBe(true);
		await expect(spaceSelect).toHaveAccessibleName("Colour space");
	});
});

// T058 (FR-017/SC-009) — every *navigation* control this feature adds (a
// direct reference link, each row of a multiply-defined target's
// always-visible list, a referenced-by badge's trigger and its listed
// links) is keyboard-operable with an accessible name describing its
// destination.
// Runs only under the "token-references" project (see playwright.config.ts):
// this file also carries the pre-existing general-fixture tests above,
// which run only under "default" — Playwright routes a whole file to a
// project, not individual tests within it, so each half gates itself.
test.describe("this feature's navigation controls (T058)", () => {
	// biome-ignore lint/correctness/noEmptyPattern: Playwright's own fixture-destructuring convention for accessing testInfo alone
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name !== "token-references",
			"runs only against the token-references fixture server",
		);
	});

	test("a direct reference link is keyboard-operable and describes its destination", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");

		// color.action.hover -> {color.action.default}: a single, unambiguous
		// definition, so this renders as a direct link (not a picker).
		const link = page.getByRole("link", { name: /color\.action\.default/ });
		await tabUntilFocused(page, link);
		expect(await hasVisibleFocusIndicator(link)).toBe(true);
		await expect(link).toHaveAccessibleName(
			"Go to color.action.default in semantic.tokens.json",
		);

		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/#color\.action\.default$/);
		await expect(
			page.locator("#token-color\\.action\\.default-heading"),
		).toBeFocused();
	});

	test("each definition of a multiply-defined target is its own independently keyboard-operable row", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");

		// color.action.default -> {color.text.primary}, multiply defined
		// (light: this file; dark: dark.tokens.json) — each mode is its own
		// always-visible list row, the row itself being the link, rather than
		// a picker behind a single trigger.
		const lightRow = page.getByRole("link", {
			name: /Go to color\.text\.primary in semantic\.tokens\.json/,
		});
		await tabUntilFocused(page, lightRow);
		expect(await hasVisibleFocusIndicator(lightRow)).toBe(true);

		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/#color\.text\.primary$/);
		await expect(
			page.locator("#token-color\\.text\\.primary-heading"),
		).toBeFocused();
	});

	test("a referenced-by badge opens, lists, and navigates to a referrer by keyboard alone", async ({
		page,
	}) => {
		await page.goto("/tokens/base.tokens.json");

		// color.brand.blue is referenced by two tokens in two other files
		// (semantic.tokens.json, references-unparseable.tokens.json).
		const badge = page
			.getByTestId("token-color.brand.blue")
			.getByRole("button", { name: "referenced twice" });
		await tabUntilFocused(page, badge);
		expect(await hasVisibleFocusIndicator(badge)).toBe(true);

		await page.keyboard.press("Enter");
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		const referrerLink = dialog.getByRole("link", {
			name: /color\.text\.primary.*semantic\.tokens\.json/,
		});
		await tabUntilFocused(page, referrerLink);
		expect(await hasVisibleFocusIndicator(referrerLink)).toBe(true);

		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(
			/\/tokens\/semantic\.tokens\.json#color\.text\.primary$/,
		);
		await expect(
			page.locator("#token-color\\.text\\.primary-heading"),
		).toBeFocused();
	});
});

// A3 (SC-003 / C-KL-2 / C-KL-3 / C-KL-7 / C-MB-5) — a Tab / Shift+Tab pass over
// the large fixture: at every stop focus is on a real control (never <body>)
// with a fully-visible focus indicator, focus order matches top-to-bottom
// visual order, and the page header does not move. Runs under "default", which
// serves large_scale.tokens.json.
test.describe("large fixture keyboard flow (A3)", () => {
	// biome-ignore lint/correctness/noEmptyPattern: Playwright's testInfo-only fixture convention
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name !== "default",
			"runs only against the default fixture server",
		);
	});

	test("a Tab / Shift+Tab pass lands on a control with a visible indicator at every stop, in visual order (A3)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");
		// U73 puts one token of every editable dispatch path (valid colour, valid
		// dimension, {reference}, no registered editor, invalid value) in the
		// first ~20 tokens; ~40 stops covers all of them plus the page chrome.
		const STOPS = 40;
		const backLink = page.getByRole("link", {
			name: /back to folder overview/i,
		});
		await expect(backLink).toBeVisible();
		const backLinkDocY = () =>
			backLink.evaluate((el) =>
				Math.round(el.getBoundingClientRect().top + window.scrollY),
			);
		const headerYBefore = await backLinkDocY();

		await page.locator("body").click();

		let fwdOnControl = 0;
		let fwdIndicator = 0;
		let orderRegressions = 0;
		let prevDocY = -1;
		const strays: string[] = [];

		for (let i = 0; i < STOPS; i++) {
			await page.keyboard.press("Tab");
			const info = await focusedInfo(page);
			if (info.isControl) {
				fwdOnControl++;
				if (await hasVisibleFocusIndicator(page.locator(":focus"))) {
					fwdIndicator++;
				}
			} else {
				strays.push(`fwd#${i} <${info.tag}> ${info.label}`);
			}
			// visual order: forward tabbing must not jump the focus *up* the page
			// by more than a hair (same-row controls share a docY; a new row is
			// lower, never higher).
			if (prevDocY >= 0 && info.docY >= 0 && info.docY < prevDocY - 4) {
				orderRegressions++;
			}
			if (info.docY >= 0) {
				prevDocY = info.docY;
			}
		}

		let backOnControl = 0;
		let backIndicator = 0;
		for (let i = 0; i < STOPS; i++) {
			await page.keyboard.press("Shift+Tab");
			const info = await focusedInfo(page);
			if (info.isControl) {
				backOnControl++;
				if (await hasVisibleFocusIndicator(page.locator(":focus"))) {
					backIndicator++;
				}
			} else {
				strays.push(`back#${i} <${info.tag}> ${info.label}`);
			}
		}

		const headerYAfter = await backLinkDocY();

		testInfo.annotations.push({
			type: "perf",
			description: `A3 fwd ${fwdOnControl}/${STOPS} control ${fwdIndicator}/${STOPS} indicator, ${orderRegressions} order regressions; back ${backOnControl}/${STOPS} control ${backIndicator}/${STOPS} indicator; header ${headerYBefore}->${headerYAfter}${strays.length ? ` | ${strays.slice(0, 6).join("; ")}` : ""}`,
		});

		// C-KL-2: 100% of stops (both directions) land on a real control…
		expect(fwdOnControl, strays.join("; ")).toBe(STOPS);
		expect(backOnControl, strays.join("; ")).toBe(STOPS);
		// …each with a fully-visible focus indicator…
		expect(fwdIndicator).toBe(STOPS);
		expect(backIndicator).toBe(STOPS);
		// C-KL-3: focus order matches top-to-bottom visual order…
		expect(orderRegressions).toBe(0);
		// C-KL-7 / SC-003: …and no element other than the focus ring moves.
		expect(headerYAfter).toBe(headerYBefore);
	});

	test("no tabbed-to control's focus ring is clipped by an overflow ancestor or obscured (A3a)", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/large_scale.tokens.json");
		const STOPS = 40;
		await page.locator("body").click();

		const clipped: string[] = [];
		const obscured: string[] = [];
		for (let i = 0; i < STOPS; i++) {
			await page.keyboard.press("Tab");
			const v = await focusRingClip(page);
			if (v.clippedBy)
				clipped.push(`#${i} ${v.label} clipped by ${v.clippedBy}`);
			if (v.obscuredBy) {
				obscured.push(`#${i} ${v.label} under ${v.obscuredBy}`);
			}
		}

		testInfo.annotations.push({
			type: "perf",
			description: `A3a ${STOPS} stops: ${clipped.length} clipped, ${obscured.length} obscured${clipped.length ? ` | ${clipped.slice(0, 4).join("; ")}` : ""}`,
		});

		// C-KL-1 / C-KL-7 / FR-007: the ring is never cropped by an `overflow`
		// ancestor nor covered by an overlapping element.
		expect(clipped, clipped.join("; ")).toEqual([]);
		expect(obscured, obscured.join("; ")).toEqual([]);
	});
});

// A9 (FR-002 / US1-S1 / C-RI-7 / Edge "Focus after commit via Enter") —
// committing a value edit with Enter keeps focus on that same visible control
// with the caret preserved; a subsequent real blur (Tab) never lands focus on
// <body>. Runs under "default" (large_scale.tokens.json).
test.describe("commit focus + caret (A9)", () => {
	// biome-ignore lint/correctness/noEmptyPattern: Playwright's testInfo-only fixture convention
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name !== "default",
			"runs only against the default fixture server",
		);
	});

	test("committing a value edit with Enter keeps focus on that control, caret preserved (A9)", async ({
		page,
	}) => {
		await page.goto("/tokens/large_scale.tokens.json");
		// `_showcase.color`'s hex value field is a `ChannelInput` — it commits on
		// Enter (`preventDefault` + flush), so focus never leaves it.
		const hexInput = page
			.getByTestId("token-_showcase.color")
			.getByRole("textbox", { name: "Legacy hex value" });
		await hexInput.focus();
		await expect(hexInput).toBeFocused();

		await hexInput.fill("#abcdef");
		const CARET = 4;
		await hexInput.evaluate(
			(el, caret) => (el as HTMLInputElement).setSelectionRange(caret, caret),
			CARET,
		);

		await page.keyboard.press("Enter");

		// focus stays on the same control, caret offset preserved, never <body>
		await expect(hexInput).toBeFocused();
		expect(
			await hexInput.evaluate((el) => (el as HTMLInputElement).selectionStart),
		).toBe(CARET);
		expect(
			await page.evaluate(() => document.activeElement === document.body),
		).toBe(false);

		// a real blur afterwards (Tab) fires the store commit — focus must land on
		// a control, not <body>.
		await page.keyboard.press("Tab");
		const landed = await page.evaluate(() => {
			const el = document.activeElement;
			return {
				isBody: el === document.body || el === null,
				tag: el?.tagName.toLowerCase() ?? "null",
				visible:
					el instanceof HTMLElement && el.getBoundingClientRect().width > 0,
			};
		});
		expect(landed.isBody, `focus landed on <${landed.tag}>`).toBe(false);
		expect(landed.visible).toBe(true);
	});
});
