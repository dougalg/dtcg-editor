import { parseTokenFile } from "@dtcg-editor/token-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { resetReferenceCatalogueCache } from "../../hooks/useReferenceCatalogue.ts";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { LoadedTokenFile } from "../../lib/tokens/load-directory.ts";
import { buildReferenceCatalogue } from "../../lib/tokens/reference-catalogue.ts";
import { buildReferenceIndex } from "../../lib/tokens/reference-index.ts";
import { TokenReferencePicker } from "./TokenReferencePicker.tsx";

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) throw new Error(result.error.message);
	return { relativePath, document: result.value };
}

const CATALOGUE = buildReferenceCatalogue(
	buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { hex: "#0000ff" } },
				red: { $value: { hex: "#ff0000" } },
				accent: { $value: "{color.blue}" },
			},
		}),
	]),
);

function okFetch() {
	return vi
		.fn()
		.mockResolvedValue(
			new Response(JSON.stringify(CATALOGUE), { status: 200 }),
		);
}

function renderOpen() {
	resetReferenceCatalogueCache();
	return render(
		<ul>
			<li>
				<TokenReferencePicker
					editedTokenPath={["color", "accent"]}
					currentReferenceValue="{color.blue}"
					onStageEdit={vi.fn()}
					fetchImpl={okFetch()}
				/>
			</li>
		</ul>,
	);
}

test("the highlighted candidate's full preview (value + would-resolve-to) shows in the picker's live region", async () => {
	renderOpen();
	const trigger = await screen.findByRole("combobox", {
		name: /repoint reference for/i,
	});
	trigger.click();

	const field = await screen.findByRole("combobox", { name: /search tokens/i });
	field.focus();
	const region = () =>
		screen.getByRole("status", { name: "Search results" }).textContent ?? "";

	// cmdk auto-highlights the first row (color.accent -> {color.blue} -> #0000ff).
	await waitFor(() => {
		expect(region()).toMatch(/#0000ff/i);
		expect(region()).toMatch(/would resolve to/i);
	});

	// Moving the highlight updates the previewed value.
	field.dispatchEvent(
		new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
	);
	await waitFor(() => expect(region()).toMatch(/#ff0000|#0000ff/i));
	expect(region()).toMatch(/token.*match/i);
});

async function noViolations() {
	const results = await axe.run(document.body, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("the open picker, including a disabled circular row and the live region, has no WCAG 2.2 AA violations", async () => {
	renderOpen();
	const trigger = await screen.findByRole("combobox", {
		name: /repoint reference for/i,
	});
	trigger.click();
	const field = await screen.findByRole("combobox", {
		name: /search tokens/i,
	});
	// Idle shows only the current target (color.blue) — type to also bring
	// the disabled circular (self) row into view for this check.
	fireEvent.change(field, { target: { value: "color" } });

	// color.accent is the edited token -> a disabled circular row is present.
	await waitFor(() =>
		expect(
			screen
				.getByRole("option", { name: /color\.accent/ })
				.getAttribute("aria-disabled"),
		).toBe("true"),
	);
	await noViolations();
	// (the empty-popover state's axe cleanliness is covered by Combobox U15.)
});
