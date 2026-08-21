import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import { TokenBlock } from "./TokenBlock.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations with no type", async () => {
	const { container } = render(
		<ul>
			<TokenBlock name="brand-blue" type={undefined} isNonStandardType={false}>
				<span>value content</span>
			</TokenBlock>
		</ul>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations with a recognized type", async () => {
	const { container } = render(
		<ul>
			<TokenBlock name="brand-blue" type="color" isNonStandardType={false}>
				<span>value content</span>
			</TokenBlock>
		</ul>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations with a non-standard type", async () => {
	const { container } = render(
		<ul>
			<TokenBlock
				name="brand-blue"
				type="not-a-real-type"
				isNonStandardType={true}
			>
				<span>value content</span>
			</TokenBlock>
		</ul>,
	);
	await expectNoViolations(container);
});
