import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
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

/**
 * `useTokenArrival.ts` applies `.arrivalTarget` imperatively (outside
 * React), so this component's own render never shows the highlight — the
 * requirement under test lives entirely in the CSS module. jsdom's "unit"
 * project never applies real CSS, so this can't be checked via computed
 * style; instead it inspects the rule's actual source text for a
 * non-color property change alongside the color one, which is the
 * property that makes T043's a11y requirement true regardless of how
 * jsdom or a real browser renders it.
 */
test("the arrival highlight changes a non-color property, not color alone (T043)", () => {
	const tokenBlockCss = readFileSync(
		join(import.meta.dirname, "TokenBlock.module.css"),
		"utf-8",
	);
	const ruleMatch = tokenBlockCss.match(/\.token\.arrivalTarget\s*\{([^}]*)\}/);
	expect(ruleMatch).not.toBeNull();
	const declarations = ruleMatch?.[1] ?? "";

	const hasColorChange = /\bcolor\b/i.test(declarations);
	const hasNonColorChange =
		/\b(width|style|weight|outline|text-decoration)\b/i.test(declarations);

	expect(hasColorChange).toBe(true);
	expect(hasNonColorChange).toBe(true);
});

test("always renders a FieldErrorSlot and shows the threaded error inside it (U64)", () => {
	const { container: noError } = renderBlock({});
	expect(
		noError.querySelector("[data-testid='field-error-slot']"),
	).not.toBeNull();
	cleanup();

	const { container: withError } = renderBlock({
		error: { name: "The name is taken.", value: undefined },
	});
	const slot = withError.querySelector("[data-testid='field-error-slot']");
	expect(slot).not.toBeNull();
	expect(within(slot as HTMLElement).getByRole("alert").textContent).toBe(
		"The name is taken.",
	);
});

test("layout is independent of whether an error is present (U65)", () => {
	function skeleton(root: Element): string {
		const clone = root.cloneNode(true) as Element;
		const slot = clone.querySelector("[data-testid='field-error-slot']");
		if (slot !== null) {
			slot.innerHTML = ""; // ignore the slot's *contents*, keep the box
		}
		return clone.innerHTML;
	}

	const { container: clean } = renderBlock({});
	const cleanSkeleton = skeleton(clean);
	cleanup();

	const { container: withError } = renderBlock({
		error: { name: "The name is taken.", value: "Not a dimension." },
	});

	// the only difference an error makes is content *inside* the reserved slot
	expect(skeleton(withError)).toBe(cleanSkeleton);
});
