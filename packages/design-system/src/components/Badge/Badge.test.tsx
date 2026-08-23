import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Badge } from "./Badge.tsx";

test("renders its children as a span with the badge slot", () => {
	render(<Badge>New</Badge>);
	const badge = screen.getByText("New");
	expect(badge.tagName).toBe("SPAN");
	expect(badge.dataset.slot).toBe("badge");
});

test("asChild renders through Slot onto the passed child element instead of a span", () => {
	render(
		<Badge asChild>
			<a href="/releases">New</a>
		</Badge>,
	);
	const badge = screen.getByRole("link", { name: "New" });
	expect(badge.tagName).toBe("A");
	expect(badge.dataset.slot).toBe("badge");
});
