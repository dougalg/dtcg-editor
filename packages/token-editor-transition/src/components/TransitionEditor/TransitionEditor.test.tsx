import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TransitionEditor } from "./TransitionEditor.tsx";

const VALUE = {
	duration: { value: 200, unit: "ms" as const },
	delay: { value: 100, unit: "s" as const },
	timingFunction: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

test("renders labeled Duration, Delay, and timing function controls showing the current value", () => {
	render(<TransitionEditor value={VALUE} onChange={vi.fn()} />);

	const durationGroup = screen.getByRole("group", { name: "Duration" });
	expect(
		(within(durationGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("200");
	expect(
		(within(durationGroup).getByLabelText("Unit") as HTMLSelectElement).value,
	).toBe("ms");

	const delayGroup = screen.getByRole("group", { name: "Delay" });
	expect(
		(within(delayGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("100");
	expect(
		(within(delayGroup).getByLabelText("Unit") as HTMLSelectElement).value,
	).toBe("s");

	expect((screen.getByLabelText("P1x") as HTMLInputElement).value).toBe("0.4");
});

test("changing the duration control updates only duration", () => {
	const onChange = vi.fn();
	render(<TransitionEditor value={VALUE} onChange={onChange} />);

	const durationGroup = screen.getByRole("group", { name: "Duration" });
	fireEvent.change(within(durationGroup).getByLabelText("Value"), {
		target: { value: "500" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		duration: { value: 500, unit: "ms" },
	});
});

test("changing the delay control updates only delay", () => {
	const onChange = vi.fn();
	render(<TransitionEditor value={VALUE} onChange={onChange} />);

	const delayGroup = screen.getByRole("group", { name: "Delay" });
	fireEvent.change(within(delayGroup).getByLabelText("Unit"), {
		target: { value: "ms" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		delay: { value: 100, unit: "ms" },
	});
});

test("changing a timing function control point updates only timingFunction", () => {
	const onChange = vi.fn();
	render(<TransitionEditor value={VALUE} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1x"), { target: { value: "0.6" } });

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		timingFunction: [0.6, 0, 0.2, 1],
	});
});

test("the Duration and Delay controls are not confused with one another", () => {
	// Distinct duration/delay values: if the two DurationEditor instances were
	// accidentally wired to the same field, or swapped, this would fail.
	render(<TransitionEditor value={VALUE} onChange={vi.fn()} />);

	const durationGroup = screen.getByRole("group", { name: "Duration" });
	const delayGroup = screen.getByRole("group", { name: "Delay" });

	expect(
		(within(durationGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("200");
	expect(
		(within(delayGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("100");
	expect(
		(within(durationGroup).getByLabelText("Unit") as HTMLSelectElement).value,
	).toBe("ms");
	expect(
		(within(delayGroup).getByLabelText("Unit") as HTMLSelectElement).value,
	).toBe("s");
});
