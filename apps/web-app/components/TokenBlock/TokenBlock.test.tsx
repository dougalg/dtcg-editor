import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { TokenBlock } from "./TokenBlock.tsx";

function renderBlock(props: Partial<Parameters<typeof TokenBlock>[0]> = {}) {
	return render(
		<ul>
			<TokenBlock
				name="brand-blue"
				type={undefined}
				isNonStandardType={false}
				{...props}
			>
				<span>value content</span>
			</TokenBlock>
		</ul>,
	);
}

test("renders the name as a heading exactly once", () => {
	renderBlock({ name: "brand-blue" });
	const headings = screen.getAllByRole("heading", { name: "brand-blue" });
	expect(headings).toHaveLength(1);
});

test("renders no type pill when type is undefined", () => {
	renderBlock({ type: undefined });
	expect(screen.queryByText("Type:")).toBeNull();
});

test("renders a Type: pill with the type value when type is set", () => {
	renderBlock({ type: "color", isNonStandardType: false });
	expect(screen.getByText("Type:")).toBeTruthy();
	expect(screen.getByText("color")).toBeTruthy();
});

test("shows the non-standard indicator when isNonStandardType is true", () => {
	renderBlock({ type: "not-a-real-type", isNonStandardType: true });
	expect(screen.getByText("(non-standard)")).toBeTruthy();
});

test("does not show the non-standard indicator for a recognized type", () => {
	renderBlock({ type: "dimension", isNonStandardType: false });
	expect(screen.queryByText("(non-standard)")).toBeNull();
});

test("renders children unmodified", () => {
	render(
		<ul>
			<TokenBlock name="brand-blue" type={undefined} isNonStandardType={false}>
				<span data-testid="child-marker">passed-through content</span>
			</TokenBlock>
		</ul>,
	);
	expect(screen.getByTestId("child-marker").textContent).toBe(
		"passed-through content",
	);
});

function iconHref(container: HTMLElement): string | null {
	const use = container.querySelector("use");
	return (
		use?.getAttribute("xlink:href") ??
		use?.getAttributeNS("http://www.w3.org/1999/xlink", "href") ??
		null
	);
}

test("references a type-specific icon symbol in the external sprite, distinct from the fallback", () => {
	const { container: colorContainer } = renderBlock({ type: "color" });
	const { container: fallbackContainer } = renderBlock({ type: undefined });

	expect(iconHref(colorContainer)).toBe(
		"/token-types-sprite.svg#dtcg-ed-icon-color",
	);
	expect(iconHref(fallbackContainer)).toBe(
		"/token-types-sprite.svg#dtcg-ed-icon-fallback",
	);
	expect(iconHref(colorContainer)).not.toBe(iconHref(fallbackContainer));
});

test("references the fallback icon symbol for an unrecognized (non-standard) type", () => {
	const { container: nonStandardContainer } = renderBlock({
		type: "not-a-real-type",
		isNonStandardType: true,
	});

	expect(iconHref(nonStandardContainer)).toBe(
		"/token-types-sprite.svg#dtcg-ed-icon-fallback",
	);
});

test("the row wrapper element (pin-line owner) is present and contains the icon and heading", () => {
	renderBlock({ name: "brand-blue" });
	const heading = screen.getByRole("heading", { name: "brand-blue" });
	const row = heading.closest("li");
	expect(row).not.toBeNull();
	if (row !== null) {
		expect(row.querySelector("svg")).not.toBeNull();
	}
});

test("scopes the row to a single <li> containing the heading and children", () => {
	renderBlock({ name: "brand-blue" });
	const heading = screen.getByRole("heading", { name: "brand-blue" });
	const row = heading.closest("li");
	expect(row).not.toBeNull();
	if (row !== null) {
		expect(within(row).getByText("value content")).toBeTruthy();
	}
});
