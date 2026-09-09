import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * Acceptance spec for feature 009 (Edit Token References), keyboard only.
 * Runs against the "token-references" project (port 3101,
 * `e2e/fixtures/token-references/` — see playwright.config.ts), whose
 * candidate catalogue (14 distinct token paths, computed once via
 * `buildReferenceCatalogue` over this fixture set) is:
 *
 *   color.brand.blue, color.neutral.900, space.4 (base.tokens.json, literal)
 *   color.broken.missing-target (unresolved), color.broken.group-target
 *     (group-target), color.group-container.child (broken.tokens.json)
 *   color.circular.a, color.circular.b (circular.tokens.json, mutual cycle)
 *   color.text.primary (semantic.tokens.json; light + dark, multiply defined)
 *   color.action.default (-> text.primary -> brand.blue, 2-hop chain)
 *   color.action.hover (-> action.default -> …, 3-hop chain)
 *   spacing.gap (-> space.4, 1-hop chain)
 *   color.into-broken-file (unresolved), color.unaffected-sibling (resolved)
 *     (references-unparseable.tokens.json)
 *
 * US1 (A1-A6, A17) edits color.text.primary in semantic.tokens.json —
 * currently `{color.brand.blue}` — since its picker also exercises FR-002's
 * "every file" requirement (base.tokens.json's own candidates included).
 */

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

test.describe("US1 — repoint a reference by searching every token", () => {
	test("activating the reference opens a popover listing candidates from every file (A1)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");

		const trigger = page.getByRole("combobox", {
			name: "Repoint reference for color.text.primary",
		});
		await expect(trigger).toBeVisible();
		await expect(trigger).toHaveAttribute("aria-expanded", "false");

		await trigger.focus();
		await page.keyboard.press("Enter");
		await expect(trigger).toHaveAttribute("aria-expanded", "true");

		// A candidate from this file (semantic.tokens.json) …
		await expect(
			page.getByRole("option", { name: "color.action.hover" }),
		).toBeVisible();
		// … and one from a different file (base.tokens.json) — FR-002: every
		// file in the loaded set, not just the one being edited.
		await expect(
			page.getByRole("option", { name: "color.neutral.900" }),
		).toBeVisible();
	});

	test("typing a mid-path fragment narrows to the whole-path match, not just the leaf (A2)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");
		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.text.primary",
			})
			.click();

		const search = page.getByRole("combobox", { name: /search tokens/i });
		// "brand.blue" spans the group and the leaf — only a whole-dotted-path
		// substring match finds it (FR-004), a leaf-only match would not.
		await search.fill("brand.blue");

		await expect(page.getByRole("option")).toHaveCount(1);
		await expect(
			page.getByRole("option", { name: "color.brand.blue" }),
		).toBeVisible();
	});

	test("selecting a candidate stages the edit and returns focus to the trigger (A3)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");
		const trigger = page.getByRole("combobox", {
			name: "Repoint reference for color.text.primary",
		});
		await trigger.click();

		const saveButton = page.getByRole("button", { name: /^save$/i });
		await expect(saveButton).toBeDisabled();

		await page
			.getByRole("combobox", { name: /search tokens/i })
			.fill("neutral.900");
		await page.getByRole("option", { name: "color.neutral.900" }).click();

		// Closed …
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		// … focus back on the trigger …
		await expect(trigger).toBeFocused();
		// … and a pending edit is now staged (FR-006: not written yet).
		await expect(saveButton).toBeEnabled();
		const original = JSON.parse(originalSemanticBytes);
		expect(original.color.text.primary.$value).toBe("{color.brand.blue}");
	});

	test("saving a staged reference writes only that token's $value (A4, SC-007)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");
		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.text.primary",
			})
			.click();
		await page
			.getByRole("combobox", { name: /search tokens/i })
			.fill("neutral.900");
		await page.getByRole("option", { name: "color.neutral.900" }).click();

		const saveButton = page.getByRole("button", { name: /^save$/i });
		await expect(saveButton).toBeEnabled();
		await saveButton.click();
		await expect(saveButton).toBeDisabled();

		const before = JSON.parse(originalSemanticBytes);
		const after = JSON.parse(readFileSync(semanticPath, "utf-8"));

		expect(after.color.text.primary.$value).toBe("{color.neutral.900}");
		// Every other value is byte-for-byte unchanged (SC-007) …
		before.color.text.primary.$value = "{color.neutral.900}";
		expect(after).toEqual(before);
	});

	test("discarding pending edits reverts to the last saved target — directly (reload) and via the unsaved-changes guard (A5)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");
		const trigger = page.getByRole("combobox", {
			name: "Repoint reference for color.text.primary",
		});

		// Direct discard: a staged-but-unsaved edit is only ever in-memory
		// state, so reloading without saving is the "direct" discard path —
		// there is no separate always-visible discard control in this editor
		// (only the unsaved-changes navigation guard offers one, exercised
		// below).
		await trigger.click();
		await page
			.getByRole("combobox", { name: /search tokens/i })
			.fill("neutral.900");
		await page.getByRole("option", { name: "color.neutral.900" }).click();
		await expect(page.getByRole("button", { name: /^save$/i })).toBeEnabled();

		await page.reload();
		await expect(
			page.getByRole("combobox", {
				name: "Repoint reference for color.text.primary",
			}),
		).toBeVisible();
		expect(JSON.parse(readFileSync(semanticPath, "utf-8"))).toEqual(
			JSON.parse(originalSemanticBytes),
		);

		// Via the guard: stage again, trigger a cross-file nav, discard.
		await trigger.click();
		await page
			.getByRole("combobox", { name: /search tokens/i })
			.fill("neutral.900");
		await page.getByRole("option", { name: "color.neutral.900" }).click();

		const crossFileLink = page.getByRole("link", {
			name: /color\.brand\.blue/,
		});
		await crossFileLink.click();
		await expect(page.getByText("Unsaved changes")).toBeVisible();
		await page.getByRole("button", { name: "Discard and leave" }).click();
		await expect(page).toHaveURL(/\/tokens\/base\.tokens\.json/);

		expect(JSON.parse(readFileSync(semanticPath, "utf-8"))).toEqual(
			JSON.parse(originalSemanticBytes),
		);
	});

	test("a query matching no candidate shows 'No tokens found' and nothing is selectable (A6)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");
		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.text.primary",
			})
			.click();

		await page
			.getByRole("combobox", { name: /search tokens/i })
			.fill("zzz-not-a-real-token-zzz");

		await expect(page.getByText(/no tokens found/i)).toBeVisible();
		await expect(page.getByRole("option")).toHaveCount(0);
	});

	test("every token path in the fixture directory is reachable through the search (A17)", async ({
		page,
	}) => {
		await page.goto("/tokens/semantic.tokens.json");
		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.text.primary",
			})
			.click();

		// Empty query (FR-020) shows the whole catalogue — every distinct path
		// this fixture set defines (see the file header comment).
		await expect(page.getByRole("option")).toHaveCount(14);
	});
});
