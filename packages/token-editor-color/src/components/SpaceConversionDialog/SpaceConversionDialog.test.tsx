import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { ColorConversion } from "../../utils/conversion.ts";
import { SpaceConversionDialog } from "./SpaceConversionDialog.tsx";

const gamutMapped: ColorConversion = {
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

function renderDialog(
	overrides: Partial<React.ComponentProps<typeof SpaceConversionDialog>> = {},
) {
	const props = {
		open: true,
		sourceSpace: "oklch" as const,
		conversion: gamutMapped,
		onAccept: vi.fn(),
		onDeny: vi.fn(),
		...overrides,
	};
	render(<SpaceConversionDialog {...props} />);
	return props;
}

test("renders one row per channel change with formatted from/to values", () => {
	renderDialog();
	const rows = screen.getAllByRole("row").slice(1); // drop header
	expect(rows).toHaveLength(3);
	const first = rows[0]?.textContent ?? "";
	expect(first).toContain("R");
	expect(first).toContain("0.7");
	expect(first).toContain("1");
});

test("shows the gamut-clamp note", () => {
	renderDialog();
	expect(screen.getByText(/outside the srgb gamut/i)).toBeTruthy();
});

test("shows an undefined-hue note per channel", () => {
	renderDialog({
		conversion: {
			...gamutMapped,
			classification: "channel-undefined",
			notes: [{ kind: "hue-undefined", channelIndex: 2 }],
			channelChanges: [
				{ label: "L", from: 0.5, to: 0.5, changed: false },
				{ label: "C", from: 0, to: 0, changed: false },
				{ label: "H", from: 200, to: 0, changed: true },
			],
		},
	});
	expect(screen.getByText(/undefined for a grey colour/i)).toBeTruthy();
});

test("Accept fires onAccept", () => {
	const { onAccept } = renderDialog();
	fireEvent.click(screen.getByRole("button", { name: "Accept" }));
	expect(onAccept).toHaveBeenCalledTimes(1);
});

test("Deny fires onDeny", () => {
	const { onDeny } = renderDialog();
	fireEvent.click(screen.getByRole("button", { name: "Deny" }));
	expect(onDeny).toHaveBeenCalledTimes(1);
});

test("Escape fires onDeny", () => {
	const { onDeny } = renderDialog();
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(onDeny).toHaveBeenCalled();
});
