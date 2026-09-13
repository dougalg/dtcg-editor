import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { BorderPreview } from "./BorderPreview.tsx";

const VALID = {
	color: { colorSpace: "srgb", components: [1, 0, 0] },
	width: { value: 1, unit: "px" },
	style: "solid",
};

test("renders an embedded ColorPreview plus width/style text for a valid border value", () => {
	const { container } = render(<BorderPreview value={VALID} />);
	expect(screen.getByText("1px")).toBeTruthy();
	expect(screen.getByText("solid")).toBeTruthy();
	// ColorPreview renders a swatch element via the `--swatch-color` custom
	// property — assert it composed into the tree.
	expect(container.querySelector('[style*="--swatch-color"]')).toBeTruthy();
});

test("renders the custom dash-pattern style form's short summary correctly", () => {
	render(
		<BorderPreview
			value={{
				...VALID,
				style: { dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" },
			}}
		/>,
	);
	expect(screen.getByText("dashed (butt)")).toBeTruthy();
});

test("declines to render for a value missing one of color/width/style", () => {
	const { container } = render(
		<BorderPreview value={{ color: VALID.color, width: VALID.width }} />,
	);
	expect(container.firstChild).toBeNull();
});

test("declines to render when width is invalid even though color/style are valid", () => {
	const { container } = render(
		<BorderPreview
			value={{ color: VALID.color, width: "1px", style: VALID.style }}
		/>,
	);
	expect(container.firstChild).toBeNull();
});

test("declines to render when color is invalid", () => {
	const { container } = render(
		<BorderPreview
			value={{ color: "#fff", width: VALID.width, style: VALID.style }}
		/>,
	);
	expect(container.firstChild).toBeNull();
});

test("declines to render when style is invalid", () => {
	const { container } = render(
		<BorderPreview
			value={{ color: VALID.color, width: VALID.width, style: "squiggly" }}
		/>,
	);
	expect(container.firstChild).toBeNull();
});

test("declines to render for a completely unrelated shape", () => {
	const { container } = render(<BorderPreview value={42} />);
	expect(container.firstChild).toBeNull();
});
