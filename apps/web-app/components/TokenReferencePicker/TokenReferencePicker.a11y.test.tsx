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

test("the highlighted candidate's full preview shows in the picker's live region, and the redundant 'would resolve to' is omitted for a plain one-hop candidate", async () => {
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
	// What color.accent would resolve to if repointed at color.blue is
	// exactly color.blue's own resolved value, already announced above —
	// FR-012 (revised) omits the duplicate "would resolve to" here.
	await waitFor(() => {
		expect(region()).toMatch(/#0000ff/i);
	});
	expect(region()).not.toMatch(/would resolve to/i);

	// The edited token's own path (a circular candidate) is a case the
	// hypothetical genuinely adds information for — but a disabled circular
	// row is never auto-highlighted (FR-024/U11), so this shows up in the
	// row's own (non-live-region) preview rather than the live region.
	fireEvent.change(field, { target: { value: "accent" } });
	const ownRow = await screen.findByRole("option", { name: "color.accent" });
	await waitFor(() => {
		expect(ownRow.textContent).toMatch(/would resolve to/i);
		expect(ownRow.textContent).toMatch(/circular/i);
	});
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
