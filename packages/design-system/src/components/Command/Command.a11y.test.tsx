import { render } from "@testing-library/react";
import axe from "axe-core";
import { beforeAll, expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "./Command.tsx";

beforeAll(() => {
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
});

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<Command label="Commands">
			<CommandInput aria-label="Search commands" />
			<CommandList>
				<CommandEmpty>No results</CommandEmpty>
				<CommandItem>alpha</CommandItem>
				<CommandItem>beta</CommandItem>
			</CommandList>
		</Command>,
	);

	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
