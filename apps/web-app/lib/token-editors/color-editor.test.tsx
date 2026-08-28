import { colorTokenType } from "@dtcg-editor/token-editor-color";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

/**
 * Thin integration check that the inline `ColorEditor` renders through the
 * registered `colorTokenType.Editor` in the web app's jsdom environment.
 * The editor's behaviour (inline channel editing, perceptual space
 * switching + confirmation dialog, legacy-hex path, FR-021 range messages,
 * accessibility) is exercised in full inside
 * `packages/token-editor-color/src/components/ColorEditor/*` — that package
 * now has its own Vitest project, so those cases no longer need to live
 * here.
 */

const Editor = colorTokenType.Editor;

test("renders the inline function with a colour-space select and channel inputs", () => {
	render(
		<Editor
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145] }}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.getByRole("combobox", { name: "Colour space" })).toBeTruthy();
	expect((screen.getByLabelText("oklch L") as HTMLInputElement).value).toBe(
		"0.7",
	);
});

test("surfaces a range-issue alert for a structurally-valid but out-of-range value", () => {
	render(
		<Editor
			value={{ colorSpace: "hsl", components: [400, 50, 40] }}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.getByRole("alert").textContent).toMatch(
		/H\) must be >= 0 and < 360/,
	);
});

test("renders the legacy bare-hex path with an editable hex field", () => {
	render(<Editor value="#1f75cb" onChange={vi.fn()} />);
	expect(
		(screen.getByLabelText("Legacy hex value") as HTMLInputElement).value,
	).toBe("#1f75cb");
});
