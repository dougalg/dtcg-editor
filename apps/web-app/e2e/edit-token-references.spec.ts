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

		// The idle popover shows only the current target's own row — type to
		// bring the rest of the directory-wide candidate list into view.
		await page.getByRole("combobox", { name: /search tokens/i }).fill("color");

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

		// The idle popover shows only the current target — every candidate
		// path in this fixture set contains a "." (SC-002 reachability is
		// through the search, not the idle listing), so that alone surfaces
		// the whole catalogue (see the file header comment for the count).
		await page.getByRole("combobox", { name: /search tokens/i }).fill(".");
		await expect(page.getByRole("option")).toHaveCount(14);
	});
});

// US2 edits color.unaffected-sibling in references-unparseable.tokens.json
// (currently `{color.brand.blue}`) rather than color.text.primary — it needs
// a candidate list where color.text.primary itself is a normal, non-self
// candidate (US1's edited token *is* color.text.primary, which would make
// every one of these highlights the circular/self case instead of a preview
// case). No file is ever saved in this block, so no fixture backup/restore
// is needed.
test.describe("US2 — see what a candidate resolves to before committing", () => {
	async function openOn(page: import("@playwright/test").Page) {
		await page.goto("/tokens/references-unparseable.tokens.json");
		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.unaffected-sibling",
			})
			.click();
		return page.getByRole("combobox", { name: /search tokens/i });
	}

	test("a literal candidate's concrete value is previewed the same way the editor shows that type elsewhere (A7)", async ({
		page,
	}) => {
		const search = await openOn(page);
		await search.fill("brand.blue");

		const option = page.getByRole("option", { name: "color.brand.blue" });
		await expect(option).toBeVisible();
		// The colour type's own `Preview` contract — a swatch (an element
		// carrying the `--swatch-color` custom property `Swatch.tsx` sets) plus
		// the value's raw text form, exactly as `ColorPreview` renders it
		// elsewhere in the editor (format-literal-value.tsx delegates to it).
		// This is the only remaining candidate, so it is also auto-highlighted
		// — its row additionally carries the "would resolve to" hypothetical
		// (per catalogue mode), hence `.first()` rather than an exact count.
		// The swatch's own `--swatch-color` value is asserted (not merely
		// that *a* swatch element exists) — `colorValueToCssColor` renders
		// srgb {0.2, 0.4, 0.9} as `color(srgb 0.2 0.4 0.9)` (css-color.ts).
		await expect(
			option.locator('[style*="--swatch-color"]').first(),
		).toHaveAttribute(
			"style",
			/--swatch-color:\s*color\(srgb 0\.2 0\.4 0\.9\)/,
		);
		await expect(option).toContainText(/0\.2.*0\.4.*0\.9/);
	});

	test("a chained candidate previews the value at the end of the chain (A8)", async ({
		page,
	}) => {
		const search = await openOn(page);
		// color.action.hover -> action.default -> text.primary -> brand.blue:
		// a 3-hop chain: the *chain's own* end-of-chain literal, not any
		// intermediate hop's value.
		await search.fill("action.hover");

		const option = page.getByRole("option", { name: "color.action.hover" });
		await expect(option).toBeVisible();
		// Not value-pinned on the swatch itself like A7's, deliberately: this
		// candidate's own preview resolves through the multiply-defined
		// color.text.primary, and which mode's value ends up as the
		// candidate's *own* (non-hypothetical) preview swatch depends on
		// mode-fallback selection this test doesn't control — see
		// tdd/cycle-log.md's T059 entry. The end-of-chain value is still
		// pinned via the option's full text (the hypothetical block's own
		// per-mode entries include the light-mode end-of-chain value
		// unambiguously).
		await expect(
			option.locator('[style*="--swatch-color"]').first(),
		).toBeVisible();
		await expect(option).toContainText(/0\.2.*0\.4.*0\.9/);
	});

	test("a multiply-defined candidate previews one mode-labelled value per mode (A9)", async ({
		page,
	}) => {
		const search = await openOn(page);
		await search.fill("text.primary");

		const option = page.getByRole("option", { name: "color.text.primary" });
		await expect(option).toBeVisible();
		// light: {color.brand.blue} -> the base literal; dark: dark.tokens.json's
		// own literal override — two distinct values, each labelled by mode.
		// This candidate is also the sole match, so it is auto-highlighted and
		// additionally carries the "would resolve to" hypothetical block
		// (A10), which repeats its own mode labels — so each label is
		// expected *twice* (once in the candidate's own preview, once in the
		// hypothetical), not merely present, to actually pin down that the
		// candidate's own per-mode preview (not only the hypothetical) is
		// mode-labelled.
		await expect(option.getByText("light:", { exact: true })).toHaveCount(2);
		await expect(option.getByText("dark:", { exact: true })).toHaveCount(2);
		await expect(option).toContainText(/0\.2.*0\.4.*0\.9/); // light
		await expect(option).toContainText(/0\.95.*0\.95.*0\.95/); // dark
	});

	test("the edited token's own hypothetical resolution previews before any save (A10)", async ({
		page,
	}) => {
		const search = await openOn(page);
		await search.fill("text.primary");

		const option = page.getByRole("option", { name: "color.text.primary" });
		await expect(option).toContainText(/would resolve to/i);
		// live region carries the same information for screen-reader users
		// (U84) — updates as the highlight moves. Scoped to this token's own
		// row: every `TokenReferencePicker` instance on the page renders its
		// own "Search results" status region, even while closed.
		const region = page
			.getByTestId("token-color.unaffected-sibling")
			.getByRole("status", { name: "Search results" });
		await expect(region).toContainText(/would resolve to/i);
	});

	test("re-opening after an unsaved selection marks the staged target as current (A11)", async ({
		page,
	}) => {
		const search = await openOn(page);
		await search.fill("action.default");
		await page.getByRole("option", { name: "color.action.default" }).click();

		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.unaffected-sibling",
			})
			.click();

		await expect(
			page.getByRole("option", { name: "color.action.default" }),
		).toHaveAttribute("aria-current", "true");
	});
});

// US3 edits color.text.primary again (US1's target), in semantic.tokens.json
// — its own path being a candidate is exactly what A12 needs, and its
// existing chain (text.primary -> brand.blue, with action.default ->
// text.primary -> brand.blue) is what makes color.action.default a
// cycle-closing candidate for A13. No save happens in this block either.
test.describe("US3 — circular candidates are unselectable; missing/group are flagged", () => {
	async function openOnTextPrimary(page: import("@playwright/test").Page) {
		await page.goto("/tokens/semantic.tokens.json");
		await page
			.getByRole("combobox", {
				name: "Repoint reference for color.text.primary",
			})
			.click();
		return page.getByRole("combobox", { name: /search tokens/i });
	}

	test("the edited token's own path is circular-marked and unselectable by click or Enter (A12)", async ({
		page,
	}) => {
		const search = await openOnTextPrimary(page);
		await search.fill("text.primary");

		const own = page.getByRole("option", { name: "color.text.primary" });
		await expect(own).toBeVisible();
		await expect(own).toHaveAttribute("aria-disabled", "true");
		await expect(own).toContainText(/circular-reference/i);

		const trigger = page.getByRole("combobox", {
			name: "Repoint reference for color.text.primary",
		});
		// FR-024 "not selectable ... by pointer", asserted directly: a `trial`
		// click only runs Playwright's actionability check (wait, scroll,
		// hover) without dispatching the click, so it rejects here precisely
		// because the row is genuinely inert to the pointer — not merely
		// because `onSelect` happens to guard it.
		await expect(own.click({ trial: true, timeout: 2000 })).rejects.toThrow();
		// `force` bypasses that same check to still exercise the `onSelect`
		// guard directly, proving nothing is staged even if a click were
		// somehow delivered.
		await own.click({ force: true });
		await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
		await expect(trigger).toHaveAttribute("aria-expanded", "true");

		// Enter on the highlighted (disabled) row is equally inert.
		await page.keyboard.press("Enter");
		await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
		await expect(trigger).toHaveAttribute("aria-expanded", "true");
	});

	test("a candidate that would close a cycle is circular-marked, names the cycle, and stages nothing (A13)", async ({
		page,
	}) => {
		const search = await openOnTextPrimary(page);
		// color.action.default -> {color.text.primary}: picking it as
		// text.primary's own new target would close a 2-token cycle.
		await search.fill("action.default");

		const option = page.getByRole("option", { name: "color.action.default" });
		await expect(option).toHaveAttribute("aria-disabled", "true");
		await expect(option).toContainText(/circular-reference/i);

		// The "would resolve to" preview (with the cycle named) attaches only
		// to the *highlighted* row — hover sets cmdk's highlight even on a
		// disabled item (only arrow-key navigation skips one, U11).
		await option.hover();
		await expect(option).toContainText(/would resolve to/i);
		// FR-014: the preview names the tokens in the cycle.
		await expect(option).toContainText(/text\.primary/i);

		// FR-024: refused at the pointer level (see A12's comment), not only
		// by the onSelect guard `force` goes on to exercise below.
		await expect(
			option.click({ trial: true, timeout: 2000 }),
		).rejects.toThrow();
		await option.click({ force: true });
		await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
	});

	test("a broken (missing/group) starting reference still opens, stays editable, and the page renders normally (A14)", async ({
		page,
	}) => {
		await page.goto("/tokens/broken.tokens.json");

		for (const path of [
			"color.broken.missing-target",
			"color.broken.group-target",
		]) {
			const row = page.getByTestId(`token-${path}`);
			const trigger = row.getByRole("combobox", {
				name: `Repoint reference for ${path}`,
			});
			// The popover's content portals outside `row` (Radix Popover), so
			// the search field itself is named per-path and queried page-wide,
			// rather than the ambiguous /search tokens/i — cmdk's own
			// `CommandInput` hardcodes `aria-expanded="true"` unconditionally
			// (its own listbox semantics, unrelated to Popover open state), so
			// a closed-but-not-yet-unmounted picker can otherwise still match.
			const search = page.getByRole("combobox", {
				name: `Search tokens to repoint ${path}`,
			});
			await expect(trigger).toBeVisible();
			await trigger.click();
			await expect(trigger).toHaveAttribute("aria-expanded", "true");
			await expect(search).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(trigger).toHaveAttribute("aria-expanded", "false");
			await expect(search).toBeHidden();
		}
		// The page is otherwise entirely normal.
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	});

	test("a candidate resolving to a missing or group path is flagged but stays selectable (A15)", async ({
		page,
	}) => {
		const search = await openOnTextPrimary(page);

		await search.fill("missing-target");
		const missing = page.getByRole("option", {
			name: "color.broken.missing-target",
		});
		await expect(missing).not.toHaveAttribute("aria-disabled", "true");
		await expect(missing).toContainText(/missing/i);
		await missing.click();
		await expect(page.getByRole("button", { name: /^save$/i })).toBeEnabled();

		// Reload to discard, then repeat for the group-target candidate.
		await page.reload();
		await (await openOnTextPrimary(page)).fill("group-target");
		const group = page.getByRole("option", {
			name: "color.broken.group-target",
		});
		await expect(group).not.toHaveAttribute("aria-disabled", "true");
		await expect(group).toContainText(/group/i);
		await group.click();
		await expect(page.getByRole("button", { name: /^save$/i })).toBeEnabled();
	});

	test("a circular candidate is visibly distinct as unselectable next to a clean one (A16)", async ({
		page,
	}) => {
		const search = await openOnTextPrimary(page);
		await search.fill("color");

		const circular = page.getByRole("option", { name: "color.text.primary" });
		const clean = page.getByRole("option", { name: "color.brand.blue" });
		await expect(circular).toHaveAttribute("aria-disabled", "true");
		await expect(circular).toContainText(/circular-reference/i);
		await expect(clean).not.toHaveAttribute("aria-disabled", "true");
		await expect(clean).not.toContainText(/circular-reference/i);
	});
});

// T049 — reinforces A14/FR-021: when the whole-directory catalogue can't be
// built at all (the route itself failing, not just a slow response), the
// picker degrades to a raw-text alias input instead of breaking the page.
test.describe("degradation when the catalogue route fails (T049, FR-021)", () => {
	test("the picker falls back to an editable raw-alias input, no previews, page otherwise fine", async ({
		page,
	}) => {
		await page.route("**/api/tokens/references", (route) =>
			route.fulfill({ status: 500, body: "{}" }),
		);
		await page.goto("/tokens/semantic.tokens.json");

		const trigger = page.getByRole("combobox", {
			name: "Repoint reference for color.text.primary",
		});
		await expect(trigger).toBeVisible();
		await trigger.click();

		// FR-021: a raw, editable alias text input — not the Combobox popover.
		const raw = page.getByRole("textbox", {
			name: /reference for color\.text\.primary/i,
		});
		await expect(raw).toBeVisible();
		await expect(raw).toHaveValue("{color.brand.blue}");
		await expect(page.getByRole("option")).toHaveCount(0);

		await raw.fill("{color.neutral.900}");
		await expect(page.getByRole("button", { name: /^save$/i })).toBeEnabled();

		// The rest of the page is entirely normal.
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(
			page.getByRole("textbox", { name: /^gap name$/i }),
		).toBeVisible();
	});
});
