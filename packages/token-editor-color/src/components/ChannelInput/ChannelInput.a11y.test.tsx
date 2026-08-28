import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ChannelInput } from "./ChannelInput.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a plain numeric channel input has no WCAG 2.2 AA violations and an accessible name", async () => {
	const { container, getByLabelText } = render(
		<ChannelInput label="oklch L" value={0.7} onCommit={vi.fn()} />,
	);
	expect(getByLabelText("oklch L")).toBeTruthy();
	await expectNoViolations(container);
});

test("an invalid channel input wired to an alert region has no violations", async () => {
	const { container } = render(
		<div>
			<ChannelInput
				label="hsl H"
				value={400}
				onCommit={vi.fn()}
				invalid
				describedById="issues"
			/>
			<div id="issues" role="alert">
				hsl component 0 (H) must be &gt;= 0 and &lt; 360
			</div>
		</div>,
	);
	await expectNoViolations(container);
});
