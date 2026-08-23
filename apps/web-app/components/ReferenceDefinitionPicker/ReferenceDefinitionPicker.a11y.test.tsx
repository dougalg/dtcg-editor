import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { ReferenceDefinitionPicker } from "./ReferenceDefinitionPicker.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

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

test("has no WCAG 2.2 AA violations with the popover closed", async () => {
	const { container } = render(
		<ReferenceDefinitionPicker resolved={twoModeReference()} />,
	);
	await expectNoViolations(container);
});

test("the trigger is keyboard-operable", () => {
	render(<ReferenceDefinitionPicker resolved={twoModeReference()} />);
	const trigger = screen.getByText("{text}").closest("button");
	expect(trigger).not.toBeNull();
	trigger?.focus();
	expect(document.activeElement).toBe(trigger);
});

test("each definition link is reachable and keyboard-operable once opened", () => {
	render(<ReferenceDefinitionPicker resolved={twoModeReference()} />);
	fireEvent.click(screen.getByText("{text}"));

	const links = screen.getAllByRole("link");
	expect(links).toHaveLength(2);
	for (const link of links) {
		expect(link.tabIndex).not.toBe(-1);
	}
});
