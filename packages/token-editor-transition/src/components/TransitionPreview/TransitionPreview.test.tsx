import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TransitionPreview } from "./TransitionPreview.tsx";

const ZERO_DELAY_VALUE = {
	duration: { value: 200, unit: "ms" as const },
	delay: { value: 0, unit: "ms" as const },
	timingFunction: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

test("renders one line combining duration and timing function, delay omitted when zero", () => {
	render(<TransitionPreview value={ZERO_DELAY_VALUE} />);
	expect(screen.getByText("200ms cubic-bezier(0.4, 0, 0.2, 1)")).toBeTruthy();
});

test("includes the delay in that same line when it is non-zero", () => {
	render(
		<TransitionPreview
			value={{
				...ZERO_DELAY_VALUE,
				delay: { value: 100, unit: "ms" as const },
			}}
		/>,
	);
	expect(
		screen.getByText("200ms cubic-bezier(0.4, 0, 0.2, 1), delay 100ms"),
	).toBeTruthy();
});

test("matches DurationPreview/CubicBezierPreview's own formatting exactly", () => {
	render(
		<TransitionPreview
			value={{
				duration: { value: 1.5, unit: "s" as const },
				delay: { value: 0, unit: "s" as const },
				timingFunction: [0, 0.1, 1, 0.9],
			}}
		/>,
	);
	expect(screen.getByText("1.5s cubic-bezier(0, 0.1, 1, 0.9)")).toBeTruthy();
});

test("declines to render for a value that does not conform to the transition schema", () => {
	const { container } = render(
		<TransitionPreview value={{ duration: { value: 1, unit: "ms" } }} />,
	);
	expect(container.firstChild).toBeNull();
});
