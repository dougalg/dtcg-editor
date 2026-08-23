import { validateTokenValue } from "@dtcg-editor/token-editor-contract";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { colorTokenType } from "../../token-type.ts";
import { ColorValidationErrorHandler } from "./ColorValidationErrorHandler.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a wrong-length components array's alert has no WCAG 2.2 AA violations", async () => {
	const raw = { colorSpace: "srgb", components: [1, 2] };
	const result = validateTokenValue(colorTokenType, raw);
	expect(result.isErr()).toBe(true);
	if (result.isErr()) {
		const { container } = render(
			<ColorValidationErrorHandler value={raw} error={result.error} />,
		);
		await expectNoViolations(container);
	}
});

test("a malformed legacy hex string's alert has no WCAG 2.2 AA violations", async () => {
	const raw = "not-a-hex-value";
	const result = validateTokenValue(colorTokenType, raw);
	expect(result.isErr()).toBe(true);
	if (result.isErr()) {
		const { container } = render(
			<ColorValidationErrorHandler value={raw} error={result.error} />,
		);
		await expectNoViolations(container);
	}
});
