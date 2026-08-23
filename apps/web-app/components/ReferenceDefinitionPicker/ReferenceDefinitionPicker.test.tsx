import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { ReferenceDefinitionPicker } from "./ReferenceDefinitionPicker.tsx";

// No manual DOM cleanup here: vitest.setup.ts already registers a global
// `cleanup()` afterEach, and Radix's Popover renders its content into a
// portal appended directly to `document.body` — a blunt
// `document.body.innerHTML = ""` races that portal's own React-managed
// unmount and throws "node to be removed is not a child of this node".

function twoModeReference(): ResolvedReference {
	return {
		reference: { targetPath: ["text"], at: [], raw: "{text}" },
		outcomes: [
			{
				mode: "light",
				chain: {
					steps: [{ path: ["text"], file: "semantic.json", mode: "light" }],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [0, 0, 0] },
						type: "color",
					},
				},
				targetFile: "semantic.json",
			},
			{
				mode: "dark",
				chain: {
					steps: [{ path: ["text"], file: "dark.json", mode: "dark" }],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [1, 1, 1] },
						type: "color",
					},
				},
				targetFile: "dark.json",
			},
		],
	};
}

test("the trigger shows the reference text and describes how many definitions exist", () => {
	render(<ReferenceDefinitionPicker resolved={twoModeReference()} />);
	const trigger = screen.getByText("{text}");
	expect(trigger.closest("button")?.getAttribute("aria-label")).toMatch(
		/2 available/,
	);
});

test("opening the popover lists every definition, each labelled by file and mode", () => {
	render(<ReferenceDefinitionPicker resolved={twoModeReference()} />);
	fireEvent.click(screen.getByText("{text}"));

	expect(screen.getByText("light:")).toBeTruthy();
	expect(screen.getByText("dark:")).toBeTruthy();
	expect(screen.getByText("semantic.json")).toBeTruthy();
	expect(screen.getByText("dark.json")).toBeTruthy();
});

test("each resolved definition is activatable, with an accessible name describing its destination", () => {
	render(<ReferenceDefinitionPicker resolved={twoModeReference()} />);
	fireEvent.click(screen.getByText("{text}"));

	const lightLink = screen.getByRole("link", { name: /text.*semantic\.json/ });
	expect(lightLink.getAttribute("href")).toBe("/tokens/semantic.json#text");

	const darkLink = screen.getByRole("link", { name: /text.*dark\.json/ });
	expect(darkLink.getAttribute("href")).toBe("/tokens/dark.json#text");
});

test("an unresolvable outcome among the definitions is shown but not activatable", () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["text"], at: [], raw: "{text}" },
		outcomes: [
			{
				mode: "light",
				chain: {
					steps: [{ path: ["text"], file: "semantic.json", mode: "light" }],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [0, 0, 0] },
						type: "color",
					},
				},
				targetFile: "semantic.json",
			},
			{
				mode: "dark",
				chain: {
					steps: [],
					outcome: { kind: "unresolved", missingPath: ["x"] },
				},
				targetFile: undefined,
			},
		],
	};
	render(<ReferenceDefinitionPicker resolved={resolved} />);
	fireEvent.click(screen.getByText("{text}"));

	expect(screen.getByText("unresolvable")).toBeTruthy();
	expect(screen.getAllByRole("link")).toHaveLength(1);
});

test("never silently picks a winner: every outcome gets its own list entry", () => {
	render(<ReferenceDefinitionPicker resolved={twoModeReference()} />);
	fireEvent.click(screen.getByText("{text}"));
	expect(screen.getAllByRole("link")).toHaveLength(2);
});
