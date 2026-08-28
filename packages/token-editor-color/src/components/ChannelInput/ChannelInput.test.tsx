import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ChannelInput } from "./ChannelInput.tsx";

test("renders as a focusable input from first render, showing the formatted value", () => {
	render(<ChannelInput label="oklch L" value={0.5} onCommit={vi.fn()} />);
	const input = screen.getByLabelText("oklch L") as HTMLInputElement;
	expect(input.tagName).toBe("INPUT");
	expect(input.value).toBe("0.5");
});

test("shows the stored value with no rounding, trailing zeros trimmed", () => {
	render(<ChannelInput label="oklch C" value={0.123456} onCommit={vi.fn()} />);
	expect((screen.getByLabelText("oklch C") as HTMLInputElement).value).toBe(
		"0.123456",
	);
});

test("Enter commits a parsed number", () => {
	const onCommit = vi.fn();
	render(<ChannelInput label="R" value={0} onCommit={onCommit} />);
	const input = screen.getByLabelText("R");
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "0.75" } });
	fireEvent.keyDown(input, { key: "Enter" });
	expect(onCommit).toHaveBeenCalledWith(0.75);
});

test("blur commits a parsed number", () => {
	const onCommit = vi.fn();
	render(<ChannelInput label="R" value={0} onCommit={onCommit} />);
	const input = screen.getByLabelText("R");
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "0.25" } });
	fireEvent.blur(input);
	expect(onCommit).toHaveBeenCalledWith(0.25);
});

test("a non-numeric or empty entry is not committed and reverts", () => {
	const onCommit = vi.fn();
	render(<ChannelInput label="R" value={0.4} onCommit={onCommit} />);
	const input = screen.getByLabelText("R") as HTMLInputElement;
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "abc" } });
	fireEvent.blur(input);
	expect(onCommit).not.toHaveBeenCalled();
	expect(input.value).toBe("0.4");
});

test("Escape abandons the edit and reverts to the current value", () => {
	const onCommit = vi.fn();
	render(<ChannelInput label="R" value={0.4} onCommit={onCommit} />);
	const input = screen.getByLabelText("R") as HTMLInputElement;
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "0.9" } });
	fireEvent.keyDown(input, { key: "Escape" });
	expect(onCommit).not.toHaveBeenCalled();
	expect(input.value).toBe("0.4");
});

test("a 'none' channel renders the literal text then accepts a numeric edit", () => {
	const onCommit = vi.fn();
	render(<ChannelInput label="H" value="none" onCommit={onCommit} />);
	const input = screen.getByLabelText("H") as HTMLInputElement;
	expect(input.value).toBe("none");
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "120" } });
	fireEvent.blur(input);
	expect(onCommit).toHaveBeenCalledWith(120);
});

test("emptying an input that has onClear triggers removal", () => {
	const onClear = vi.fn();
	render(
		<ChannelInput
			label="Alpha"
			value={0.5}
			onCommit={vi.fn()}
			onClear={onClear}
		/>,
	);
	const input = screen.getByLabelText("Alpha");
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "" } });
	fireEvent.blur(input);
	expect(onClear).toHaveBeenCalled();
});

test("text mode accepts a valid #rrggbb and rejects a malformed hex", () => {
	const onCommit = vi.fn();
	render(
		<ChannelInput
			mode="text"
			label="Legacy hex value"
			value="#1f75cb"
			onCommit={onCommit}
		/>,
	);
	const input = screen.getByLabelText("Legacy hex value") as HTMLInputElement;
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "#abcdef" } });
	fireEvent.blur(input);
	expect(onCommit).toHaveBeenCalledWith("#abcdef");

	onCommit.mockClear();
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: "#ff" } });
	fireEvent.blur(input);
	expect(onCommit).not.toHaveBeenCalled();
});

test("invalid wires aria-invalid and aria-describedby", () => {
	render(
		<ChannelInput
			label="H"
			value={400}
			onCommit={vi.fn()}
			invalid
			describedById="issues-1"
		/>,
	);
	const input = screen.getByLabelText("H");
	expect(input.getAttribute("aria-invalid")).toBe("true");
	expect(input.getAttribute("aria-describedby")).toBe("issues-1");
});
