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

	const initiallyVisible = page.getByRole("button", { name: /^switch to/i });
	await page.keyboard.press("Tab");
	await expect(initiallyVisible).toBeFocused();
	expect(await hasVisibleFocusIndicator(initiallyVisible)).toBe(true);

	const initialLabel = await initiallyVisible.getAttribute("aria-label");
	await page.keyboard.press(" ");

	const nowVisible = page.getByRole("button", { name: /^switch to/i });
	await expect(nowVisible).toHaveAttribute(
		"aria-label",
		initialLabel === "Switch to dark theme"
			? "Switch to light theme"
			: "Switch to dark theme",
	);
	await expect(page.locator("html")).toHaveAttribute(
		"data-theme",
		initialLabel === "Switch to dark theme" ? "dark" : "light",
	);
});

test("only one button is ever visible/focusable, and clicking it swaps to the other", async ({
	page,
}) => {
	await page.goto("/");

	const toDark = page.getByRole("button", { name: "Switch to dark theme" });
	const toLight = page.getByRole("button", { name: "Switch to light theme" });

	await expect(toDark).toBeVisible();
	await expect(toLight).not.toBeVisible();

	await toDark.click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await expect(toLight).toBeVisible();
	await expect(toDark).not.toBeVisible();

	await toLight.click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	await expect(toDark).toBeVisible();
	await expect(toLight).not.toBeVisible();
});

test("the toggle is present and the page has no WCAG 2.2 AA violations with it visible", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByRole("button", { name: /^switch to/i })).toBeVisible();

	const results = await runAxe(page);
	expect(results.violations).toEqual([]);
});

test.describe("first load with no saved preference (US1)", () => {
	test.describe(() => {
		test.use({ colorScheme: "dark" });

		test("shows the 'switch to light' button (i.e. dark is active) when the OS prefers dark", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(
				page.getByRole("button", { name: "Switch to light theme" }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Switch to dark theme" }),
			).not.toBeVisible();
			await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		});

		test("never flashes light before settling on dark (no FOUC)", async ({
			page,
		}) => {
			// Records every value `data-theme` takes on, from the earliest
			// possible moment (before React hydrates) through settling — a
			// regression check for a real bug where a previous, state-driven
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
			await page
				.getByRole("button", { name: "Switch to light theme" })
				.waitFor();
			await page.waitForTimeout(300);

			const log = await page.evaluate(
				() => (window as unknown as { __themeLog: string[] }).__themeLog,
			);
			expect(log).not.toContain("light");
		});
	});

	test.describe(() => {
		test.use({ colorScheme: "light" });

		test("shows the 'switch to dark' button (i.e. light is active) when the OS prefers light", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(
				page.getByRole("button", { name: "Switch to dark theme" }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Switch to light theme" }),
			).not.toBeVisible();
			await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
		});
	});
});
