import { render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { formatLiteralValue } from "./format-literal-value.tsx";

afterEach(() => {
	document.body.innerHTML = "";
});

const VALID_COLOR = { colorSpace: "srgb", components: [0, 0, 1] };

function renderNode(node: ReturnType<typeof formatLiteralValue>) {
	return render(<div data-testid="host">{node}</div>);
}

test("returns the type's built-in Preview output when a contract has one", () => {
	const { container } = renderNode(formatLiteralValue(VALID_COLOR, "color"));

	// The colour contract's Preview renders a swatch (a --swatch-color style).
	expect(container.querySelector('[style*="--swatch-color"]')).not.toBeNull();
});

test("renders dimension's own Preview instead of raw JSON", () => {
	const { getByText } = renderNode(
		formatLiteralValue({ value: 16, unit: "px" }, "dimension"),
	);
	expect(getByText("16px")).toBeTruthy();
});

test("falls back to the raw text form when there is no usable Preview", () => {
	// no type
	const untyped = renderNode(formatLiteralValue("plain-string", undefined));
	expect(untyped.getByText("plain-string")).toBeTruthy();
	expect(
		untyped.container.querySelector('[style*="--swatch-color"]'),
	).toBeNull();

	// an unrecognized type has no built-in contract
	const unknownType = renderNode(formatLiteralValue("x", "not-a-real-type"));
	expect(unknownType.getByText("x")).toBeTruthy();

	// the colour Preview declines a value that isn't a colour: raw text, no swatch
	const declined = renderNode(formatLiteralValue("#nope", "color"));
	expect(declined.getByText("#nope")).toBeTruthy();
	expect(
		declined.container.querySelector('[style*="--swatch-color"]'),
	).toBeNull();
});
