import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StrokeStylePreview } from "./StrokeStylePreview.tsx";

test("renders a named-style value as its keyword text", () => {
	render(<StrokeStylePreview value="dashed" />);
	expect(screen.getByText("dashed")).toBeTruthy();
});

test("renders a custom dash-pattern value as a short summary", () => {
	render(
		<StrokeStylePreview
			value={{
				dashArray: [
					{ value: 4, unit: "px" },
					{ value: 2, unit: "px" },
				],
				lineCap: "butt",
			}}
		/>,
	);
	expect(screen.getByText("dashed (butt)")).toBeTruthy();
});

test("declines to render for a value that fails schema validation", () => {
	const { container } = render(<StrokeStylePreview value={{ not: "valid" }} />);
	expect(container.firstChild).toBeNull();
});
