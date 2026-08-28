import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import type { ColorConversion } from "../../utils/conversion.ts";
import { SpaceConversionDialog } from "./SpaceConversionDialog.tsx";

const conversion: ColorConversion = {
	targetSpace: "srgb",
	components: [1, 0.1, 0.2],
	alpha: undefined,
	hex: undefined,
	classification: "gamut-mapped",
	channelChanges: [
		{ label: "R", from: 0.7, to: 1, changed: true },
		{ label: "G", from: 0.3, to: 0.1, changed: true },
		{ label: "B", from: 30, to: 0.2, changed: true },
	],
	notes: [{ kind: "gamut-clamped" }],
	deltaEOK: 0.08,
};

test("the open conversion dialog has no WCAG 2.2 AA violations", async () => {
	render(
		<SpaceConversionDialog
			open
			sourceSpace="oklch"
			conversion={conversion}
			onAccept={vi.fn()}
			onDeny={vi.fn()}
		/>,
	);
	const dialog = screen.getByRole("dialog");
	const results = await axe.run(dialog, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("initial focus lands on Deny", async () => {
	render(
		<SpaceConversionDialog
			open
			sourceSpace="oklch"
			conversion={conversion}
			onAccept={vi.fn()}
			onDeny={vi.fn()}
		/>,
	);
	await Promise.resolve();
	expect(document.activeElement).toBe(
		screen.getByRole("button", { name: "Deny" }),
	);
});
