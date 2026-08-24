import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const semanticPath = fileURLToPath(
	new URL("./fixtures/token-references/semantic.tokens.json", import.meta.url),
);

let originalSemanticBytes: string;

test.beforeEach(() => {
	originalSemanticBytes = readFileSync(semanticPath, "utf-8");
});

test.afterEach(() => {
	writeFileSync(semanticPath, originalSemanticBytes);
});

test("a same-file reference jump moves the fragment and focus without a full navigation (US2 AC1)", async ({
	page,
}) => {
	await page.goto("/tokens/semantic.tokens.json");

	// color.action.hover -> {color.action.default}, both in this same file —
	// a single, unambiguous definition, so this renders as a direct link.
	const link = page.getByRole("link", { name: /color\.action\.default/ });
	await link.click();

	await expect(page).toHaveURL(/#color\.action\.default$/);
	const heading = page.locator("#token-color\\.action\\.default-heading");
	await expect(heading).toBeFocused();
});

test("a cross-file reference jump navigates to the other file with the target focused (US2 AC2)", async ({
	page,
}) => {
	await page.goto("/tokens/semantic.tokens.json");

	// color.text.primary -> {color.brand.blue}, defined only in base.tokens.json.
	const link = page.getByRole("link", { name: /color\.brand\.blue/ });
	await link.click();

	await expect(page).toHaveURL(
		/\/tokens\/base\.tokens\.json#color\.brand\.blue$/,
	);
	const heading = page.locator("#token-color\\.brand\\.blue-heading");
	await expect(heading).toBeFocused();
});

test("arriving via a reference opens a collapsed ancestor group (US2 AC3)", async ({
	page,
}) => {
	await page.goto("/tokens/semantic.tokens.json");

	// Collapse the "text" group, which contains color.text.primary — the
	// target of color.action.default's own reference.
	// Not getByRole("button") — this project's <summary> disclosure has no
	// role mapping in this Chromium build's accessibility tree (confirmed
	// empirically; see TreeGroupNode.a11y.test.tsx for the same finding
	// against Testing Library's aria-query), so it's found by its label.
	const textToggle = page.getByLabel("Toggle text");
	await textToggle.click();
	const textDetails = textToggle.locator("xpath=ancestor::details[1]");
	await expect(textDetails).not.toHaveAttribute("open", "");

	// color.action.default references color.text.primary, which is multiply
	// defined (light: this file itself; dark: dark.tokens.json) — each mode
	// is its own always-visible list row, the row itself being the link.
	const lightRow = page.getByRole("link", {
		name: /Go to color\.text\.primary in semantic\.tokens\.json/,
	});
	await lightRow.click();

	await expect(page).toHaveURL(/#color\.text\.primary$/);
	// Native <details> auto-expansion should have re-opened "text".
	await expect(textDetails).toHaveAttribute("open", "");
	const heading = page.locator("#token-color\\.text\\.primary-heading");
	await expect(heading).toBeFocused();
});

test("a multiply-defined target offers every definition, labelled by file and mode, never picking a winner (US2 AC4)", async ({
	page,
}) => {
	await page.goto("/tokens/semantic.tokens.json");

	// color.action.default's reference row lists both of color.text.primary's
	// definitions — light (this file) and dark (dark.tokens.json) — as
	// always-visible, independently navigable rows, never picking a winner.
	const referenceRow = page.getByTestId("token-color.action.default");
	await expect(referenceRow.getByText("light:")).toBeVisible();
	await expect(referenceRow.getByText("dark:")).toBeVisible();
	await expect(
		referenceRow.getByRole("link", { name: /semantic\.tokens\.json/i }),
	).toBeVisible();
	await expect(
		referenceRow.getByRole("link", { name: /dark\.tokens\.json/i }),
	).toBeVisible();
});

test("an unresolvable reference is never offered as a link (US2 AC5)", async ({
	page,
}) => {
	await page.goto("/tokens/broken.tokens.json");

	await expect(
		page.getByRole("link", { name: /color\.nope\.not\.real/ }),
	).toHaveCount(0);
	await expect(
		page.getByRole("link", { name: /color\.group-container/ }),
	).toHaveCount(0);
});

test("activating a cross-file reference with unsaved edits prompts to save, discard, or stay (US2 AC7)", async ({
	page,
}) => {
	await page.goto("/tokens/semantic.tokens.json");

	const gapNameInput = page.getByRole("textbox", { name: /^gap name$/i });
	await gapNameInput.fill("gap-renamed");

	const crossFileLink = page.getByRole("link", { name: /color\.brand\.blue/ });
	await crossFileLink.click();

	const dialog = page.getByText("Unsaved changes");
	await expect(dialog).toBeVisible();
	await expect(page).toHaveURL(/\/tokens\/semantic\.tokens\.json/);

	// "Stay" keeps the edit and the current page.
	await page.getByRole("button", { name: "Stay" }).click();
	await expect(dialog).not.toBeVisible();
	await expect(gapNameInput).toHaveValue("gap-renamed");
	await expect(page).toHaveURL(/\/tokens\/semantic\.tokens\.json/);

	// Now discard and confirm the cross-file navigation actually happens.
	await crossFileLink.click();
	await page.getByRole("button", { name: "Discard and leave" }).click();
	await expect(page).toHaveURL(
		/\/tokens\/base\.tokens\.json#color\.brand\.blue$/,
	);
});

test("a same-file jump is never intercepted, even with unsaved edits", async ({
	page,
}) => {
	await page.goto("/tokens/semantic.tokens.json");

	const gapNameInput = page.getByRole("textbox", { name: /^gap name$/i });
	await gapNameInput.fill("gap-renamed");

	const sameFileLink = page.getByRole("link", {
		name: /color\.action\.default/,
	});
	await sameFileLink.click();

	await expect(page.getByText("Unsaved changes")).not.toBeVisible();
	await expect(page).toHaveURL(/#color\.action\.default$/);
	await expect(gapNameInput).toHaveValue("gap-renamed");
});

// T050a — each failure case surfaces its own distinct, non-activatable
// warning (spec FR-011a/SC-011), and the page stays usable in every case,
// including the circular fixture (SC-007).
test("a missing-target reference shows its own distinct warning naming the missing path", async ({
	page,
}) => {
	await page.goto("/tokens/broken.tokens.json");
	const alert = page
		.getByRole("alert")
		.filter({ hasText: "color.nope.not.real" });
	await expect(alert).toBeVisible();
	await expect(alert).toContainText(/missing/i);
});

test("a group-target reference shows its own distinct warning naming the group path", async ({
	page,
}) => {
	await page.goto("/tokens/broken.tokens.json");
	const alert = page
		.getByRole("alert")
		.filter({ hasText: "color.group-container" });
	await expect(alert).toBeVisible();
	await expect(alert).toContainText(/group/i);
});

test("a circular reference shows its own distinct warning naming the cycle, and the page stays usable", async ({
	page,
}) => {
	await page.goto("/tokens/circular.tokens.json");

	const alertA = page
		.getByRole("alert")
		.filter({ hasText: /circular/i })
		.first();
	await expect(alertA).toBeVisible();
	await expect(alertA).toContainText(/color\.circular\.a/);
	await expect(alertA).toContainText(/color\.circular\.b/);

	// The rest of the page (both tokens) is still rendered and interactive.
	await expect(page.getByRole("textbox", { name: /^a name$/i })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /^b name$/i })).toBeVisible();
});

test("the three failure warnings are all distinguishable text, none activatable", async ({
	page,
}) => {
	await page.goto("/tokens/broken.tokens.json");

	const missingAlert = await page
		.getByRole("alert")
		.filter({ hasText: "color.nope.not.real" })
		.textContent();
	const groupAlert = await page
		.getByRole("alert")
		.filter({ hasText: "color.group-container" })
		.textContent();

	expect(missingAlert).not.toBe(groupAlert);
	await expect(page.getByRole("link", { name: /color\.nope/ })).toHaveCount(0);
	await expect(
		page.getByRole("link", { name: /color\.group-container/ }),
	).toHaveCount(0);
});

test("a reference into a file that failed to parse is unresolved, and other references in the same file still resolve", async ({
	page,
}) => {
	await page.goto("/tokens/references-unparseable.tokens.json");

	// One bad file (unparseable.tokens.json) never affects this file's other,
	// perfectly good references (spec FR-007).
	const workingLink = page.getByRole("link", { name: /color\.brand\.blue/ });
	await expect(workingLink).toBeVisible();

	const brokenAlert = page
		.getByRole("alert")
		.filter({ hasText: /would-have-been-here/ });
	await expect(brokenAlert).toBeVisible();
});

// T056 — the reverse index (US3): color.brand.blue is referenced by two
// tokens, each in a different file from base.tokens.json and from each
// other (semantic.tokens.json's color.text.primary, and
// references-unparseable.tokens.json's color.unaffected-sibling).
test("a referrer list expands to show every referrer, each labelled by its file (US3)", async ({
	page,
}) => {
	await page.goto("/tokens/base.tokens.json");

	const row = page.getByTestId("token-color.brand.blue");
	const badge = row.getByRole("button", { name: "referenced twice" });
	await badge.click();

	// Accessible name is "Go to <path> in <file>" (ReferencedByBadge's
	// aria-label), not the visible "<file>: <path>" text order.
	await expect(
		page.getByRole("link", {
			name: /color\.text\.primary.*semantic\.tokens\.json/,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("link", {
			name: /color\.unaffected-sibling.*references-unparseable\.tokens\.json/,
		}),
	).toBeVisible();
});

test("activating a referrer navigates back to that referencing token (US3)", async ({
	page,
}) => {
	await page.goto("/tokens/base.tokens.json");

	const row = page.getByTestId("token-color.brand.blue");
	await row.getByRole("button", { name: "referenced twice" }).click();
	await page
		.getByRole("link", {
			name: /color\.text\.primary.*semantic\.tokens\.json/,
		})
		.click();

	await expect(page).toHaveURL(
		/\/tokens\/semantic\.tokens\.json#color\.text\.primary$/,
	);
	const heading = page.locator("#token-color\\.text\\.primary-heading");
	await expect(heading).toBeFocused();
});
