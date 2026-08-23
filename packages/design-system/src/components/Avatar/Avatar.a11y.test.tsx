import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Avatar, AvatarFallback, AvatarImage } from "./Avatar.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<Avatar>
			<AvatarImage src="https://example.com/avatar.png" alt="Dougal Graham" />
			<AvatarFallback>DG</AvatarFallback>
		</Avatar>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
