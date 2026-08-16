import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { FallbackValueEditor } from "./FallbackValueEditor.tsx";

afterEach(() => {
	cleanup();
});

test("renders the given JSON text as the textarea's value", () => {
	render(
		<FallbackValueEditor value='{"value":4,"unit":"px"}' onChange={vi.fn()} />,
	);

	const textarea = screen.getByLabelText("Value (JSON)") as HTMLTextAreaElement;
	expect(textarea.value).toBe('{"value":4,"unit":"px"}');
});

test("calls onChange with the raw edited text, unparsed and unvalidated", () => {
	const onChange = vi.fn();
	render(<FallbackValueEditor value="1" onChange={onChange} />);

	const textarea = screen.getByLabelText("Value (JSON)");
	fireEvent.change(textarea, { target: { value: "not valid json" } });

	expect(onChange).toHaveBeenCalledWith("not valid json");
});
