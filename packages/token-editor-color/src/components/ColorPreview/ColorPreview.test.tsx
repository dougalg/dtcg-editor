import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ColorPreview } from "./ColorPreview.tsx";

test("renders an oklch value with alpha as CSS Color 4 syntax, not JSON", () => {
	render(
		<ColorPreview
			value={{
				colorSpace: "oklch",
				components: [0.7, 0.1, 180],
				alpha: 0.8,
			}}
		/>,
	);
	expect(screen.getByText("oklch(0.7 0.1 180 / 0.8)")).toBeTruthy();
});

test("renders an hsl value with percent-based saturation/lightness channels", () => {
	render(
		<ColorPreview value={{ colorSpace: "hsl", components: [210, 50, 40] }} />,
	);
	expect(screen.getByText("hsl(210 50% 40%)")).toBeTruthy();
});

test("renders a display-p3 value using the generic color() predicate", () => {
	render(
		<ColorPreview
			value={{ colorSpace: "display-p3", components: [1, 0, 0.5] }}
		/>,
	);
	expect(screen.getByText("color(display-p3 1 0 0.5)")).toBeTruthy();
});

test("renders a lab value's unbounded a/b channels as plain numbers", () => {
	render(
		<ColorPreview value={{ colorSpace: "lab", components: [50, 40, -30] }} />,
	);
	expect(screen.getByText("lab(50 40 -30)")).toBeTruthy();
});

test("renders a 'none' component using the CSS none keyword", () => {
	render(
		<ColorPreview
			value={{ colorSpace: "hsl", components: ["none", 50, 40] }}
		/>,
	);
	expect(screen.getByText("hsl(none 50% 40%)")).toBeTruthy();
});

test("renders a value with no alpha set, omitting the / syntax entirely", () => {
	render(
		<ColorPreview
			value={{ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }}
		/>,
	);
	expect(screen.getByText("color(srgb 0.5 0.2 0.8)")).toBeTruthy();
});

test("renders a legacy bare-hex string unchanged", () => {
	render(<ColorPreview value="#3366ff" />);
	expect(screen.getByText("#3366ff")).toBeTruthy();
});

test("declines to render for a value that fails color validation", () => {
	const { container } = render(<ColorPreview value={{ not: "a color" }} />);
	expect(container.firstChild).toBeNull();
});

test("the swatch's rendered color matches the adjacent text (SC-002)", () => {
	const { container } = render(
		<ColorPreview
			value={{ colorSpace: "oklch", components: [0.7, 0.1, 180], alpha: 0.8 }}
		/>,
	);
	const swatch = container.querySelector('[style*="--swatch-color"]');
	expect(swatch?.getAttribute("style")).toContain(
		"--swatch-color: oklch(0.7 0.1 180 / 0.8)",
	);
	expect(screen.getByText("oklch(0.7 0.1 180 / 0.8)")).toBeTruthy();
});
