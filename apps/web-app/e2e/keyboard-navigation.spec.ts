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

	test("the color editor's native color picker is keyboard-reachable with an accessible name (AC-12)", async ({
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

		// Every color token on this page has its own "Pick a color" input, so
		// scope to blue-500's own token `<li>` (its nearest `<li>` ancestor, not
		// the group's, which also "contains" every sibling token) rather than
		// `page.getByLabel`, which would be ambiguous across the whole tree.
		const tokenListItem = tokenNameInput.locator("xpath=ancestor::li[1]");
		const picker = tokenListItem.getByLabel("Pick a color");
		await tabUntilFocused(page, picker);
		expect(await hasVisibleFocusIndicator(picker)).toBe(true);
		await expect(picker).toHaveAccessibleName("Pick a color");
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
