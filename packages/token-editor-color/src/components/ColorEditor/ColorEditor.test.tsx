import { COLOR_SPACES } from "@dtcg-editor/token-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ColorEditor } from "./ColorEditor.tsx";

function spaceSelect(): HTMLSelectElement {
	return screen.getByRole("combobox", {
		name: "Colour space",
	}) as HTMLSelectElement;
}

function pickSpace(name: string): void {
	fireEvent.change(spaceSelect(), { target: { value: name } });
}

// --- US1: inline editing -------------------------------------------------

test("renders the inline function with a live space select and channel inputs", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145] }}
			onChange={vi.fn()}
		/>,
	);
	expect(
		screen.getByRole("combobox", { name: "Colour space" }).textContent,
	).toContain("oklch");
	expect((screen.getByLabelText("oklch L") as HTMLInputElement).value).toBe(
		"0.7",
	);
});

test("editing a channel calls onChange with the updated components", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);
	const r = screen.getByLabelText("srgb R");
	fireEvent.focus(r);
	fireEvent.change(r, { target: { value: "0.5" } });
	fireEvent.blur(r);
	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: [0.5, 0, 0],
	});
});

test("the hex fallback stays in sync when the value carries one", async () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{
				colorSpace: "srgb",
				components: [0, 0, 0],
				hex: "#000000",
			}}
			onChange={onChange}
		/>,
	);
	const r = screen.getByLabelText("srgb R");
	fireEvent.focus(r);
	fireEvent.change(r, { target: { value: "1" } });
	fireEvent.blur(r);
	await waitFor(() => expect(onChange).toHaveBeenCalled());
	const [next] = onChange.mock.calls[0] ?? [];
	expect(next.components).toEqual([1, 0, 0]);
	expect(next.hex).toBe("#ff0000");
});

test("a channel edit with no hex fallback applies synchronously", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);
	const r = screen.getByLabelText("srgb R");
	fireEvent.focus(r);
	fireEvent.change(r, { target: { value: "0.5" } });
	fireEvent.blur(r);
	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: [0.5, 0, 0],
	});
});

test("Escape mid-edit writes nothing", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.2, 0.2] }}
			onChange={onChange}
		/>,
	);
	const r = screen.getByLabelText("srgb R");
	fireEvent.focus(r);
	fireEvent.change(r, { target: { value: "0.9" } });
	fireEvent.keyDown(r, { key: "Escape" });
	expect(onChange).not.toHaveBeenCalled();
});

test("no 'none' checkbox, no native colour picker, no standalone hex field", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.queryByLabelText("R is none")).toBeNull();
	expect(screen.queryByLabelText("Has alpha")).toBeNull();
	expect(screen.queryByLabelText("Hex (optional)")).toBeNull();
	expect(document.querySelector('input[type="color"]')).toBeNull();
});

// --- US1: legacy bare-hex ---------------------------------------------------

test("a legacy bare-hex value renders an editable hex field + a 'hex' space select", () => {
	const onChange = vi.fn();
	render(<ColorEditor value="#1f75cb" onChange={onChange} />);
	const hex = screen.getByLabelText("Legacy hex value") as HTMLInputElement;
	expect(hex.value).toBe("#1f75cb");
	expect(
		screen.getByRole("combobox", { name: "Colour space" }).textContent,
	).toContain("hex");
	fireEvent.focus(hex);
	fireEvent.change(hex, { target: { value: "#abcdef" } });
	fireEvent.blur(hex);
	expect(onChange).toHaveBeenCalledWith("#abcdef");
});

// --- US1: FR-021 range messages ------------------------------------------

test("an out-of-range channel shows the alert region and wires aria-describedby", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "hsl", components: [400, 50, 40] }}
			onChange={vi.fn()}
		/>,
	);
	const alert = screen.getByRole("alert");
	expect(alert.textContent).toMatch(/H\) must be >= 0 and < 360/);
	const h = screen.getByLabelText("hsl H");
	expect(h.getAttribute("aria-invalid")).toBe("true");
	expect(h.getAttribute("aria-describedby")).toBe(alert.id);
});

test("an in-range value shows no alert region", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.queryByRole("alert")).toBeNull();
});

// --- US2: colour-space switching ---------------------------------------

test("restricts the offered spaces to the configured allow-list", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={vi.fn()}
			options={{ colorSpaces: ["srgb", "hsl"] }}
		/>,
	);
	expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
		"srgb",
		"hsl",
	]);
});

test("offers every space when unconfigured", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.getAllByRole("option")).toHaveLength(COLOR_SPACES.length);
});

test("an in-gamut switch applies immediately with no dialog", async () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={onChange}
		/>,
	);
	pickSpace("oklch");
	await waitFor(() => expect(onChange).toHaveBeenCalled());
	expect(screen.queryByRole("dialog")).toBeNull();
	const [next] = onChange.mock.calls[0] ?? [];
	expect(next.colorSpace).toBe("oklch");
});

test("an out-of-gamut switch opens the dialog before any write; Deny is a no-op", async () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "oklch", components: [0.7, 0.3, 30] }}
			onChange={onChange}
		/>,
	);
	pickSpace("srgb");
	await screen.findByRole("dialog");
	expect(onChange).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Deny" }));
	expect(onChange).not.toHaveBeenCalled();
	expect(
		screen.getByRole("combobox", { name: "Colour space" }).textContent,
	).toContain("oklch");
});

test("Accept writes the converted, gamut-mapped value", async () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "oklch", components: [0.7, 0.3, 30] }}
			onChange={onChange}
		/>,
	);
	pickSpace("srgb");
	fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
	await waitFor(() => expect(onChange).toHaveBeenCalled());
	const [next] = onChange.mock.calls[0] ?? [];
	expect(next.colorSpace).toBe("srgb");
	for (const c of next.components) {
		expect(c).toBeGreaterThanOrEqual(0);
		expect(c).toBeLessThanOrEqual(1);
	}
});

test("spaceSwitchTolerance: 0 forces the dialog on an otherwise-silent switch", async () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={onChange}
			options={{ spaceSwitchTolerance: 0 }}
		/>,
	);
	pickSpace("oklab");
	await screen.findByRole("dialog");
	expect(onChange).not.toHaveBeenCalled();
});

test("switching a legacy bare-hex value to a real space writes object form", async () => {
	const onChange = vi.fn();
	render(<ColorEditor value="#1f75cb" onChange={onChange} />);
	pickSpace("oklch");
	await waitFor(() => expect(onChange).toHaveBeenCalled());
	const [next] = onChange.mock.calls.at(-1) ?? [];
	expect(typeof next).toBe("object");
	expect(next.colorSpace).toBe("oklch");
});
