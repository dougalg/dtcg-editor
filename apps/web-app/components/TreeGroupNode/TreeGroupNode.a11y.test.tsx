import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TokenTree } from "../TokenTree/TokenTree.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

function groupTree(): PlainDtcgNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [
			{
				kind: "group",
				name: "spacing",
				path: ["spacing"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [
					{
						kind: "token",
						name: "small",
						path: ["spacing", "small"],
						value: { value: 4, unit: "px" },
						declaredType: "dimension",
						effectiveType: "dimension",
						description: undefined,
						deprecated: undefined,
					},
				],
			},
		],
	};
}

test("has no WCAG 2.2 AA violations expanded", async () => {
	const { container } = render(
		<TokenTree node={groupTree()} relativePath="a.json" />,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations collapsed", async () => {
	const { container } = render(
		<TokenTree node={groupTree()} relativePath="a.json" />,
	);
	fireEvent.click(screen.getByLabelText("Toggle spacing"));
	await expectNoViolations(container);
});

/**
 * Closes the a11y gap the previous `<button>` toggle left open (neither
 * `aria-expanded` nor `aria-controls`): per HTML-AAM, a native `<summary>`
 * inside `<details>` has an implicit "button" role whose expanded state a
 * real browser derives directly from `open` — no explicit `aria-expanded`
 * needs to be written for a real screen reader to announce it correctly.
 *
 * This can't be asserted end-to-end here: `aria-query` (which Testing
 * Library's `getByRole` uses to compute implicit roles) has no entry at
 * all for `<summary>` — confirmed directly against its `domMap.js`, which
 * lists `summary` with no `role` key, unlike elements it does map (e.g.
 * `button`). That's a real gap in that library's native-HTML coverage, not
 * a signal about this component; real browsers (verified per quickstart.md
 * Scenario 2, task T060) expose the state correctly regardless. What *is*
 * verifiable here is the precondition a browser needs to expose it
 * correctly at all: an accessible name on the control, and the underlying
 * `open` state actually changing on activation — both asserted below,
 * with the toggle-behavior half already covered by
 * `TreeGroupNode.test.tsx`'s own tests.
 */
test("the disclosure control has an accessible name and its native open state changes on activation", () => {
	render(<TokenTree node={groupTree()} relativePath="a.json" />);
	const summary = screen.getByLabelText("Toggle spacing");
	const details = summary.closest("details");
	if (details === null) {
		throw new Error("expected <summary> to be inside a <details>");
	}
	expect(details.open).toBe(true);

	fireEvent.click(summary);

	expect(details.open).toBe(false);
});
