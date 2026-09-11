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
