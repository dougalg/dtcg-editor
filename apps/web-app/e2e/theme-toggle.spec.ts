import { expect, test } from "@playwright/test";
import { runAxe } from "./support/axe.ts";

async function hasVisibleFocusIndicator(
	locator: import("@playwright/test").Locator,
) {
	return locator.evaluate((el) => {
		const style = getComputedStyle(el);
		return style.outlineStyle !== "none" || style.boxShadow !== "none";
	});
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		window.localStorage.removeItem("dtcg-ed-theme-preference");
	});
});

test("is keyboard-reachable, keyboard-operable, and shows a visible focus ring", async ({
	page,
}) => {
	await page.goto("/");

	const toggle = page.getByRole("button");
	await page.keyboard.press("Tab");
	await expect(toggle).toBeFocused();
	expect(await hasVisibleFocusIndicator(toggle)).toBe(true);

	const initialTheme = await page.locator("html").getAttribute("data-theme");
	await page.keyboard.press(" ");

	await expect(page.locator("html")).toHaveAttribute(
		"data-theme",
		initialTheme === "dark" ? "light" : "dark",
	);
});

test("clicking toggles the accessible name and data-theme, one button throughout", async ({
	page,
}) => {
	await page.goto("/");
	const toggle = page.getByRole("button");

	await expect(toggle).toHaveAccessibleName("Switch to dark theme");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

	await toggle.click();
	await expect(toggle).toHaveAccessibleName("Switch to light theme");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

	await toggle.click();
	await expect(toggle).toHaveAccessibleName("Switch to dark theme");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the toggle is present and the page has no WCAG 2.2 AA violations with it visible", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByRole("button")).toBeVisible();

	const results = await runAxe(page);
	expect(results.violations).toEqual([]);
});

test.describe("first load with no saved preference (US1)", () => {
	test.describe(() => {
		test.use({ colorScheme: "dark" });

		test("accessible name is 'switch to light' (i.e. dark is active) when the OS prefers dark", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page.getByRole("button")).toHaveAccessibleName(
				"Switch to light theme",
			);
			await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		});

		test("never flashes light before settling on dark (no FOUC)", async ({
			page,
		}) => {
			// Records every value `data-theme` takes on, from the earliest
			// possible moment (before React hydrates) through settling — a
			// regression check for a real bug where an earlier, state-driven
			// version of this control briefly overwrote the inline
			// FOUC-prevention script's already-correct pre-paint value. The
			// current CSS-only design has no React state to disagree with the
			// DOM in the first place, but this guards against a regression.
			await page.addInitScript(() => {
				(window as unknown as { __themeLog: string[] }).__themeLog = [];
				const observer = new MutationObserver((mutations) => {
					for (const mutation of mutations) {
						if (mutation.attributeName === "data-theme") {
							(window as unknown as { __themeLog: string[] }).__themeLog.push(
								document.documentElement.getAttribute("data-theme") ?? "",
							);
						}
					}
				});
				observer.observe(document.documentElement, { attributes: true });
			});

			await page.goto("/");
			await page.getByRole("button").waitFor();
			await page.waitForTimeout(300);

			const log = await page.evaluate(
				() => (window as unknown as { __themeLog: string[] }).__themeLog,
			);
			expect(log).not.toContain("light");
		});
	});

	test.describe(() => {
		test.use({ colorScheme: "light" });

		test("accessible name is 'switch to dark' (i.e. light is active) when the OS prefers light", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page.getByRole("button")).toHaveAccessibleName(
				"Switch to dark theme",
			);
			await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
		});
	});
});
