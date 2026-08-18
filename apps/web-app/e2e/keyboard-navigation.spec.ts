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

	const backLink = page.getByRole("link", { name: /back to folder overview/i });
	await tabTo(page, backLink);

	const groupToggle = page.getByRole("button", {
		name: /collapse spacing-scale/i,
	});
	await tabTo(page, groupToggle);

	const groupNameInput = page.getByRole("textbox", { name: "Group Name:" });
	await tabTo(page, groupNameInput);

	const tokenNameInput = page.getByRole("textbox", {
		name: "0 name",
		exact: true,
	});
	await tabTo(page, tokenNameInput);

	const dimensionValueInput = page
		.getByRole("spinbutton", { name: "Dimension value" })
		.first();
	await tabTo(page, dimensionValueInput);
	expect(await hasVisibleFocusIndicator(dimensionValueInput)).toBe(true);

	// Edit the value, keyboard-only: select the existing text, then replace it.
	await page.keyboard.press("Home");
	await page.keyboard.press("Shift+End");
	await page.keyboard.type("42");

	const dimensionUnitSelect = page
		.getByRole("combobox", { name: "Dimension unit" })
		.first();
	await tabTo(page, dimensionUnitSelect);

	const descriptionInput = page.getByRole("textbox", {
		name: "0 description",
		exact: true,
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
		name: "blue-500 name",
		exact: true,
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
