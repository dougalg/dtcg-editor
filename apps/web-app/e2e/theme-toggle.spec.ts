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

	const toggle = page.getByRole("switch");
	await page.keyboard.press("Tab");
	await expect(toggle).toBeFocused();
	expect(await hasVisibleFocusIndicator(toggle)).toBe(true);

	const initiallyChecked = await toggle.getAttribute("aria-checked");
	await page.keyboard.press(" ");
	await expect(toggle).toHaveAttribute(
		"aria-checked",
		initiallyChecked === "true" ? "false" : "true",
	);

	const html = page.locator("html");
	await expect(html).toHaveAttribute(
		"data-theme",
		initiallyChecked === "true" ? "light" : "dark",
	);
});

test("the accessible name always describes what activating it will do next", async ({
	page,
}) => {
	await page.goto("/");
	const toggle = page.getByRole("switch");

	await expect(toggle).toHaveAttribute("data-state", "unchecked");
	await expect(toggle).toHaveAccessibleName("Switch to dark theme");

	await toggle.click();
	await expect(toggle).toHaveAttribute("data-state", "checked");
	await expect(toggle).toHaveAccessibleName("Switch to light theme");
});

test("the toggle is present and the page has no WCAG 2.2 AA violations with it visible", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByRole("switch")).toBeVisible();

	const results = await runAxe(page);
	expect(results.violations).toEqual([]);
});

test.describe("first load with no saved preference (US1)", () => {
	test.describe(() => {
		test.use({ colorScheme: "dark" });

		test("shows checked/dark when the OS prefers dark", async ({ page }) => {
			await page.goto("/");
			const toggle = page.getByRole("switch");

			await expect(toggle).toHaveAttribute("aria-checked", "true");
			await expect(toggle).toHaveAttribute("data-state", "checked");
			await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		});

		test("never flashes light before settling on dark (no FOUC)", async ({
			page,
		}) => {
			// Records every value `data-theme` takes on, from the earliest
			// possible moment (before React hydrates) through settling — a
			// regression check for a real bug where the toggle's own
			// placeholder React state briefly overwrote the inline
			// FOUC-prevention script's already-correct pre-paint value.
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
			await page.waitForSelector('[role="switch"]');
			await page.waitForTimeout(300);

			const log = await page.evaluate(
				() => (window as unknown as { __themeLog: string[] }).__themeLog,
			);
			expect(log).not.toContain("light");
		});
	});

	test.describe(() => {
		test.use({ colorScheme: "light" });

		test("shows unchecked/light when the OS prefers light", async ({
			page,
		}) => {
			await page.goto("/");
			const toggle = page.getByRole("switch");

			await expect(toggle).toHaveAttribute("aria-checked", "false");
			await expect(toggle).toHaveAttribute("data-state", "unchecked");
			await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
		});
	});
});
