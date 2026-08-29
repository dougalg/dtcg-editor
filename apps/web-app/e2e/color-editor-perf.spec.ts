import { expect, test } from "@playwright/test";

/**
 * Page-level performance guard for the inline colour editor. Opening the
 * colour-space control must be fast and must NOT stage an edit / churn
 * page state. Runs against the production build (see playwright.config.ts).
 *
 * Context: a component-level jsdom "render time" test can't see this — the
 * cost that matters here is portal mount + focus + positioning inside the
 * real page, and whether the interaction accidentally writes to the token
 * document. Both are only observable end to end.
 */

test.describe("color editor — colour-space select performance", () => {
	test("opening the colour-space select is fast and stages no edit", async ({
		page,
	}, testInfo) => {
		await page.goto("/tokens/color_scale.tokens.json");

		// blue-500's own row.
		const nameInput = page.getByRole("textbox", { name: /^blue-500 name$/i });
		await expect(nameInput).toBeVisible();
		const row = nameInput.locator("xpath=ancestor::li[1]");
		const combo = row.getByRole("combobox", { name: /colou?r space/i });
		await expect(combo).toBeVisible();

		const saveButton = page.getByRole("button", { name: /^save$/i });
		const saveDisabledBefore = await saveButton.isDisabled();

		async function openAndMeasure(): Promise<number> {
			const before = await page.evaluate(() => performance.now());
			await combo.click();
			await page
				.getByRole("option", { name: "srgb" })
				.first()
				.waitFor({ state: "visible" });
			const after = await page.evaluate(() => performance.now());
			await page.keyboard.press("Escape");
			await expect(page.getByRole("listbox")).toHaveCount(0);
			return Math.round(after - before);
		}

		const cold = await openAndMeasure();
		const warm1 = await openAndMeasure();
		const warm2 = await openAndMeasure();

		testInfo.annotations.push({
			type: "perf",
			description: `colour-space select open — cold ${cold}ms, warm ${warm1}ms / ${warm2}ms`,
		});

		// Opening a listbox must never write to the document.
		expect(await saveButton.isDisabled()).toBe(saveDisabledBefore);

		// A warm open is pure runtime; a regression to seconds fails here.
		expect(warm1).toBeLessThan(500);
		expect(warm2).toBeLessThan(500);
		// The first open gets headroom for one-time portal/browser setup.
		expect(cold).toBeLessThan(1500);
	});
});
