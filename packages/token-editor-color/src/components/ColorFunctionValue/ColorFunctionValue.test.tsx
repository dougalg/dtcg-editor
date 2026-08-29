import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ColorFunctionValue } from "./ColorFunctionValue.tsx";

const base = {
	value: {
		colorSpace: "oklch" as const,
		components: [0.7, 0.15, 145] as [number, number, number],
	},
	onComponentChange: vi.fn(),
	onAlphaChange: vi.fn(),
};

test("renders one channel input per component with formatted (unrounded) values", () => {
	render(<ColorFunctionValue {...base} />);
	expect((screen.getByLabelText("oklch L") as HTMLInputElement).value).toBe(
		"0.7",
	);
	expect((screen.getByLabelText("oklch C") as HTMLInputElement).value).toBe(
		"0.15",
	);
	expect((screen.getByLabelText("oklch H") as HTMLInputElement).value).toBe(
		"145",
	);
});

test("shows a full-precision value without rounding", () => {
	render(
		<ColorFunctionValue
			{...base}
			value={{ colorSpace: "oklch", components: [0.123456, 0.15, 145] }}
		/>,
	);
	expect((screen.getByLabelText("oklch L") as HTMLInputElement).value).toBe(
		"0.123456",
	);
});

test("shows the alpha segment only when alpha is present", () => {
	const { rerender } = render(<ColorFunctionValue {...base} />);
	expect(screen.queryByLabelText("alpha")).toBeNull();
	expect(screen.getByText("+ α")).toBeTruthy();

	rerender(
		<ColorFunctionValue {...base} value={{ ...base.value, alpha: 0.5 }} />,
	);
	expect((screen.getByLabelText("alpha") as HTMLInputElement).value).toBe(
		"0.5",
	);
	expect(screen.queryByText("+ α")).toBeNull();
});

test("the + α control adds alpha: 1", () => {
	const onAlphaChange = vi.fn();
	render(<ColorFunctionValue {...base} onAlphaChange={onAlphaChange} />);
	fireEvent.click(screen.getByText("+ α"));
	expect(onAlphaChange).toHaveBeenCalledWith(1);
});

test("clearing the alpha input removes the alpha segment", () => {
	const onAlphaChange = vi.fn();
	render(
		<ColorFunctionValue
			{...base}
			value={{ ...base.value, alpha: 0.5 }}
			onAlphaChange={onAlphaChange}
		/>,
	);
	const alpha = screen.getByLabelText("alpha");
	fireEvent.focus(alpha);
	fireEvent.change(alpha, { target: { value: "" } });
	fireEvent.blur(alpha);
	expect(onAlphaChange).toHaveBeenCalledWith(undefined);
});

test("editing a channel calls onComponentChange with the index and value", () => {
	const onComponentChange = vi.fn();
	render(
		<ColorFunctionValue {...base} onComponentChange={onComponentChange} />,
	);
	const l = screen.getByLabelText("oklch L");
	fireEvent.focus(l);
	fireEvent.change(l, { target: { value: "0.55" } });
	fireEvent.blur(l);
	expect(onComponentChange).toHaveBeenCalledWith(0, 0.55);
});

test("the `/` separator carries no interactive handlers", () => {
	render(
		<ColorFunctionValue {...base} value={{ ...base.value, alpha: 0.5 }} />,
	);
	const slash = screen.getByText("/", { exact: false });
	expect(slash.tagName).toBe("SPAN");
	expect(slash.getAttribute("tabindex")).toBeNull();
});

test("propagates invalid[i] + issueDescribedById to the matching ChannelInput", () => {
	render(
		<ColorFunctionValue
			{...base}
			value={{ colorSpace: "hsl", components: [400, 50, 40] }}
			invalid={[true, false, false]}
			issueDescribedById="issues-x"
		/>,
	);
	const h = screen.getByLabelText("hsl H");
	expect(h.getAttribute("aria-invalid")).toBe("true");
	expect(h.getAttribute("aria-describedby")).toBe("issues-x");
	expect(
		screen.getByLabelText("hsl S").getAttribute("aria-invalid"),
	).toBeNull();
});
