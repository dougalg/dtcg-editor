import { expect, test } from "@playwright/test";

/**
 * Page-level guard for the inline colour editor's colour-space control.
 * Runs against the production build (see playwright.config.ts).
 *
 * History: this used to measure the *open* cost of a Radix `Select` portal
 * — a real regression once shipped where the control appeared ~5s after
 * the rest of the page. That control is now a native `<select>`: no
 * portal, no popup mount, nothing to time on open (the dropdown is the
 * browser's, invisible to Playwright). What's still worth guarding end to
 * end is what the original regression actually broke — the control is
 * present quickly after navigation — plus that merely focusing it never
 * stages a token edit.
 */

test.describe("color editor — colour-space control", () => {
	test("appears promptly after navigation and focusing it stages no edit", async ({
		page,
	}, testInfo) => {
		const before = performance.now();
		await page.goto("/tokens/color_scale.tokens.json");

		// blue-500's own row.
		const nameInput = page.getByRole("textbox", { name: /^blue-500 name$/i });
		await expect(nameInput).toBeVisible();
		const row = nameInput.locator("xpath=ancestor::li[1]");
		const combo = row.getByRole("combobox", { name: /colou?r space/i });
		await expect(combo).toBeVisible();
		const appearedMs = Math.round(performance.now() - before);

		// It's the native control, not a JS popup widget that can regress
		// the same way.
		expect(await combo.evaluate((el) => el.tagName)).toBe("SELECT");

		const saveButton = page.getByRole("button", { name: /^save$/i });
		const saveDisabledBefore = await saveButton.isDisabled();

		// Focusing / blurring the control must not write to the document —
		// only an actual value change does.
		await combo.focus();
		await page.keyboard.press("Escape");
		await nameInput.focus();
		expect(await saveButton.isDisabled()).toBe(saveDisabledBefore);

		testInfo.annotations.push({
			type: "perf",
			description: `colour-space control visible ${appearedMs}ms after navigation`,
		});

		// A return to the old "seconds behind the page" behaviour fails here.
		expect(appearedMs).toBeLessThan(4000);
	});
});
