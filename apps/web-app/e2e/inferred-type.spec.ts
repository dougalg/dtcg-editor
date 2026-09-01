import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const fixturePath = fileURLToPath(
	new URL(
		"./fixtures/inferred-type-tokens/swatch.tokens.json",
		import.meta.url,
	),
);

let originalBytes: string;

test.beforeEach(() => {
	originalBytes = readFileSync(fixturePath, "utf-8");
});

test.afterEach(() => {
	writeFileSync(fixturePath, originalBytes);
});

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

// spec 008-token-core-coherence, User Story 1 (FR-001/FR-003a/FR-003b/SC-001/SC-006):
// an unambiguous, undeclared-type token loads as editable with an
// inferred-type suggestion, and accepting + saving it persists $type and
// survives a reload.
test("an inferred-but-undeclared-type token loads editable with a suggestion, and accepting + saving it persists $type (SC-001, SC-006)", async ({
	page,
}) => {
	await page.goto("/tokens/swatch.tokens.json");

	// SC-001: editable with a correctly inferred type badge/suggestion,
	// not the old "untyped, unsupported" read-only state.
	await expect(page.getByText("Suggested type: color")).toBeVisible();
	await expect(page.getByText(/Only standard DTCG token types/)).toHaveCount(0);

	const acceptButton = page.getByRole("button", { name: "Use this type" });

	// Keyboard-only: reach and activate the suggestion (Constitution
	// Principle X's whole-page/keyboard-flow a11y tier).
	await tabUntilFocused(page, acceptButton);
	expect(await hasVisibleFocusIndicator(acceptButton)).toBe(true);
	await page.keyboard.press("Enter");

	// Accepting hides the suggestion (staged, not yet saved).
	await expect(page.getByText("Suggested type: color")).toHaveCount(0);

	const saveButton = page.getByRole("button", { name: /^save$/i });
	await tabUntilFocused(page, saveButton);
	expect(await hasVisibleFocusIndicator(saveButton)).toBe(true);
	await page.keyboard.press("Enter");
	await expect(saveButton).toBeDisabled();

	// The saved file now has an explicit $type — a normal declaration, not
	// an inference (FR-003a/SC-006).
	const saved = JSON.parse(readFileSync(fixturePath, "utf-8"));
	expect(saved.swatch.$type).toBe("color");

	// Reload: the type survives and is no longer offered as a suggestion —
	// it's a normal declared type now (SC-006).
	await page.reload();
	await expect(page.getByText("Suggested type: color")).toHaveCount(0);
	await expect(page.getByText(/Only standard DTCG token types/)).toHaveCount(0);
});

// A11 (FR-002 / Edge "Focus after commit via Enter" / C-KL-5 / US2-S3) —
// `TypeSuggestion` is the editor's only supplementary type-affordance. It is
// not revealed on focus (it is condition-mounted on an inferred `$type`), so
// FR-008's "reveals on focus in reserved space" has no surface here; the real,
// spec-grounded requirement is that **accepting it — which unmounts the focused
// button — must not strand keyboard focus on `<body>`**. The row shrinking as
// the affordance goes away is a user-initiated, expected reflow (spec
// §Assumptions), not an FR-008 violation, so it is only annotated.
test("accepting the TypeSuggestion by keyboard leaves focus on a visible control, never <body> (A11)", async ({
	page,
}, testInfo) => {
	await page.goto("/tokens/swatch.tokens.json");
	await expect(page.getByText("Suggested type: color")).toBeVisible();

	const description = page.getByRole("textbox", { name: /description/i });
	const docY = (loc: Locator) =>
		loc.evaluate((el) =>
			Math.round(el.getBoundingClientRect().top + window.scrollY),
		);
	const descBefore = await docY(description);

	await page.getByRole("button", { name: "Use this type" }).focus();
	await page.keyboard.press("Enter");
	await expect(page.getByText("Suggested type: color")).toHaveCount(0);
	await page.waitForTimeout(250);

	const focus = await page.evaluate(() => {
		const el = document.activeElement;
		return {
			isBody: el === document.body || el === null,
			tag: el?.tagName.toLowerCase() ?? "null",
			visible:
				el instanceof HTMLElement && el.getBoundingClientRect().width > 0,
		};
	});
	testInfo.annotations.push({
		type: "perf",
		description: `A11 focus after accept: <${focus.tag}> (body=${focus.isBody}); description moved ${(await docY(description)) - descBefore}px (expected reflow)`,
	});

	// FR-002 / Edge "Focus after commit via Enter": never on the document body.
	expect(focus.isBody, `focus stranded on <${focus.tag}>`).toBe(false);
	expect(focus.visible).toBe(true);
});
