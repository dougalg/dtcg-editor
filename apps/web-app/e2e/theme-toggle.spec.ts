import { expect, test } from "@playwright/test";
import { THEME_COOKIE_NAME } from "../hooks/themeConstants.ts";
import { runAxe } from "./support/axe.ts";

/**
 * The three states this feature actually has, and how they show up in the DOM:
 *
 * | state                  | `data-theme` | what decides appearance             |
 * | ---------------------- | ------------ | ----------------------------------- |
 * | follow the OS          | *absent*     | `@media (prefers-color-scheme)`, CSS |
 * | explicit dark override | `"dark"`     | `:root[data-theme="dark"]`           |
 * | explicit light override| `"light"`    | base `:root`, media block declines   |
 *
 * The attribute is rendered by the *server* from the preference cookie
 * (`app/layout.tsx`), never by a script on the client — several tests below
 * assert that directly, by reading the initial HTML or by disabling JS.
 */

async function bodyBackgroundChannelSum(page: import("@playwright/test").Page) {
	const background = await page
		.locator("body")
		.evaluate((el) => getComputedStyle(el).backgroundColor);
	const channels = background.match(/\d+(\.\d+)?/g) ?? [];
	return channels
		.slice(0, 3)
		.reduce((total, channel) => total + Number(channel), 0);
}

/** A sanity threshold rather than an exact token value, so retuning either
 * palette doesn't break these: "dark" means the three channels average below
 * mid-grey, "light" means above. */
const MID_GREY_CHANNEL_SUM = 384;

async function hasVisibleFocusIndicator(
	locator: import("@playwright/test").Locator,
) {
	return locator.evaluate((el) => {
		const style = getComputedStyle(el);
		return style.outlineStyle !== "none" || style.boxShadow !== "none";
	});
}

test.beforeEach(async ({ context }) => {
	await context.clearCookies();
});

test("is keyboard-reachable, keyboard-operable, and shows a visible focus ring", async ({
	page,
}) => {
	await page.goto("/");

	const toggle = page.getByRole("button");
	await page.keyboard.press("Tab");
	await expect(toggle).toBeFocused();
	expect(await hasVisibleFocusIndicator(toggle)).toBe(true);

	await expect(page.locator("html")).not.toHaveAttribute("data-theme");
	await page.keyboard.press(" ");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("clicking cycles override-on then override-off, one button throughout", async ({
	page,
}) => {
	await page.goto("/");
	const toggle = page.getByRole("button");

	// No cookie yet, and Playwright's default OS preference is light.
	await expect(page.locator("html")).not.toHaveAttribute("data-theme");
	await expect(toggle).toHaveAccessibleName("Switch to dark theme");

	await toggle.click();
	await expect(toggle).toHaveAccessibleName("Switch to light theme");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

	// Switching back to light *is* what the OS already prefers, so FR-005 says
	// clear the override rather than pin a redundant one — the attribute goes
	// away entirely and the page follows the OS again.
	await toggle.click();
	await expect(toggle).toHaveAccessibleName("Switch to dark theme");
	await expect(page.locator("html")).not.toHaveAttribute("data-theme");
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

		test("follows the OS into dark with no attribute set at all", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page.getByRole("button")).toHaveAccessibleName(
				"Switch to light theme",
			);
			await expect(page.locator("html")).not.toHaveAttribute("data-theme");
			expect(await bodyBackgroundChannelSum(page)).toBeLessThan(
				MID_GREY_CHANNEL_SUM,
			);
		});

		test("clicking switches to light, rather than re-asserting the dark already showing", async ({
			page,
		}) => {
			await page.goto("/");
			await expect(page.locator("html")).not.toHaveAttribute("data-theme");

			await page.getByRole("button").click();

			// With no attribute set, "what's on screen" has to come from the OS
			// preference, not from reading `data-theme` and assuming light.
			// Getting that wrong asks for the theme already displayed, which
			// clears the (absent) override and looks like a dead button.
			await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
			expect(await bodyBackgroundChannelSum(page)).toBeGreaterThan(
				MID_GREY_CHANNEL_SUM,
			);
		});

		test("never flashes light, and never touches data-theme after load", async ({
			page,
		}) => {
			// Dark now comes from the stylesheet's media query, so a correct
			// load involves *no* `data-theme` write whatsoever. Recording every
			// mutation from before hydration onward is a regression check on
			// two things at once: the old FOUC (a script painting light first),
			// and the subtler bug of the hook "helpfully" resolving the OS
			// preference into the attribute on mount — which looks identical on
			// screen but pins the appearance against later OS changes (FR-006).
			await page.addInitScript(() => {
				(window as unknown as { __themeLog: string[] }).__themeLog = [];
				const observer = new MutationObserver((mutations) => {
					for (const mutation of mutations) {
						if (mutation.attributeName === "data-theme") {
							(window as unknown as { __themeLog: string[] }).__themeLog.push(
								document.documentElement.getAttribute("data-theme") ??
									"(removed)",
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
			expect(log).toEqual([]);
			expect(await bodyBackgroundChannelSum(page)).toBeLessThan(
				MID_GREY_CHANNEL_SUM,
			);
		});
	});

	test.describe(() => {
		test.use({ colorScheme: "light" });

		test("follows the OS into light with no attribute set at all", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page.getByRole("button")).toHaveAccessibleName(
				"Switch to dark theme",
			);
			await expect(page.locator("html")).not.toHaveAttribute("data-theme");
			expect(await bodyBackgroundChannelSum(page)).toBeGreaterThan(
				MID_GREY_CHANNEL_SUM,
			);
		});
	});
});

test.describe("the override is rendered by the server, from the cookie", () => {
	test.use({ colorScheme: "light" });

	test("FR-008: a saved override survives a reload", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("button").click();
		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

		await page.reload();

		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		await expect(page.getByRole("button")).toHaveAccessibleName(
			"Switch to light theme",
		);
	});

	test("the attribute is present in the very first byte of HTML, not added by a script", async ({
		page,
		context,
		baseURL,
	}) => {
		await context.addCookies([
			{ name: THEME_COOKIE_NAME, value: "dark", url: baseURL ?? "" },
		]);

		const response = await page.goto("/");
		const html = await response?.text();

		// The whole point of the cookie: the server already knew. If this were
		// still script-driven the served `<html>` tag would carry no attribute
		// and only the live DOM would have one. Matched against the opening tag
		// specifically — `data-theme` also appears later in the RSC payload,
		// which would make a bare `toContain` pass for the wrong reason.
		expect(html).toMatch(/<html[^>]*\sdata-theme="dark"/);
	});

	test("an explicit light override beats an OS that prefers dark", async ({
		page,
		context,
		baseURL,
	}) => {
		await context.addCookies([
			{ name: THEME_COOKIE_NAME, value: "light", url: baseURL ?? "" },
		]);
		await page.emulateMedia({ colorScheme: "dark" });

		await page.goto("/");

		// This is what `:root:not([data-theme="light"])` on the media block
		// buys: the OS says dark, the user said light, light wins — with no
		// `[data-theme="light"]` rule needing to exist to undo anything.
		await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
		expect(await bodyBackgroundChannelSum(page)).toBeGreaterThan(
			MID_GREY_CHANNEL_SUM,
		);
	});

	test("a corrupted cookie is ignored and the OS preference is followed", async ({
		page,
		context,
		baseURL,
	}) => {
		await context.addCookies([
			{ name: THEME_COOKIE_NAME, value: "not-a-theme", url: baseURL ?? "" },
		]);
		await page.emulateMedia({ colorScheme: "dark" });

		await page.goto("/");

		await expect(page.locator("html")).not.toHaveAttribute("data-theme");
		expect(await bodyBackgroundChannelSum(page)).toBeLessThan(
			MID_GREY_CHANNEL_SUM,
		);
	});
});

/**
 * With JavaScript disabled nothing can set `data-theme` on the client at all,
 * so these prove the two halves of the design independently: the stylesheet
 * resolves the OS preference, and the server resolves the cookie.
 */
test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test.describe(() => {
		test.use({ colorScheme: "dark" });

		test("the OS dark preference is honoured with no data-theme attribute set", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page.locator("html")).not.toHaveAttribute("data-theme");
			expect(await bodyBackgroundChannelSum(page)).toBeLessThan(
				MID_GREY_CHANNEL_SUM,
			);
		});
	});

	test.describe(() => {
		test.use({ colorScheme: "light" });

		test("the OS light preference leaves the base light palette in place", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page.locator("html")).not.toHaveAttribute("data-theme");
			expect(await bodyBackgroundChannelSum(page)).toBeGreaterThan(
				MID_GREY_CHANNEL_SUM,
			);
		});
	});

	test.describe(() => {
		test.use({ colorScheme: "light" });

		test("a saved dark override still renders dark, purely server-side", async ({
			page,
			context,
			baseURL,
		}) => {
			await context.addCookies([
				{ name: THEME_COOKIE_NAME, value: "dark", url: baseURL ?? "" },
			]);

			await page.goto("/");

			await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
			expect(await bodyBackgroundChannelSum(page)).toBeLessThan(
				MID_GREY_CHANNEL_SUM,
			);
		});
	});
});
