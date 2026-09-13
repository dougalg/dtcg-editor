import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ShadowPreview } from "./ShadowPreview.tsx";

const VALID_LAYER = {
	color: { colorSpace: "srgb", components: [1, 0, 0] },
	offsetX: { value: 0, unit: "px" },
	offsetY: { value: 2, unit: "px" },
	blur: { value: 4, unit: "px" },
	spread: { value: 0, unit: "px" },
};

test("renders an embedded ColorPreview plus offsetX/offsetY/blur/spread text for a valid single-layer value", () => {
	const { container } = render(<ShadowPreview value={VALID_LAYER} />);
	expect(screen.getByText("0px 2px 4px 0px")).toBeTruthy();
	// ColorPreview renders a swatch element via the `--swatch-color` custom
	// property — assert it composed into the tree.
	expect(container.querySelector('[style*="--swatch-color"]')).toBeTruthy();
});

test("renders a single line (not '1 shadows') for a valid one-item array value", () => {
	render(<ShadowPreview value={[VALID_LAYER]} />);
	expect(screen.getByText("0px 2px 4px 0px")).toBeTruthy();
	expect(screen.queryByText("1 shadows")).toBeNull();
});

test('renders the literal text "2 shadows" for a valid 2-layer array', () => {
	render(<ShadowPreview value={[VALID_LAYER, VALID_LAYER]} />);
	expect(screen.getByText("2 shadows")).toBeTruthy();
});

test('renders the literal text "3 shadows" for a valid 3-layer array (N is dynamic)', () => {
	render(<ShadowPreview value={[VALID_LAYER, VALID_LAYER, VALID_LAYER]} />);
	expect(screen.getByText("3 shadows")).toBeTruthy();
});

test("declines to render for a single layer missing one of its five required keys", () => {
	const { blur, ...rest } = VALID_LAYER;
	const { container } = render(<ShadowPreview value={rest} />);
	expect(container.firstChild).toBeNull();
});

test("declines to render for a layer whose blur sub-value is invalid, even though the other four are valid", () => {
	const { container } = render(
		<ShadowPreview value={{ ...VALID_LAYER, blur: "4px" }} />,
	);
	expect(container.firstChild).toBeNull();
});

test("declines to render for an array containing one invalid layer", () => {
	const { container } = render(
		<ShadowPreview value={[VALID_LAYER, { ...VALID_LAYER, blur: "4px" }]} />,
	);
	expect(container.firstChild).toBeNull();
});

test("declines to render for an empty array", () => {
	const { container } = render(<ShadowPreview value={[]} />);
	expect(container.firstChild).toBeNull();
});

test("declines to render for a completely unrelated shape", () => {
	const { container } = render(<ShadowPreview value={42} />);
	expect(container.firstChild).toBeNull();
});
