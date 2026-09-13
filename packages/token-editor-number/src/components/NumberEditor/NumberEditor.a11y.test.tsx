import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { NumberEditor } from "./NumberEditor.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<NumberEditor value={1.5} onChange={vi.fn()} />);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
