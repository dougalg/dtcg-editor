import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Avatar, AvatarFallback, AvatarImage } from "./Avatar.tsx";

test("renders the root with the avatar data-slot and forwarded className", () => {
	const { container } = render(
		<Avatar className="custom">
			<AvatarFallback>DG</AvatarFallback>
		</Avatar>,
	);
	const avatar = container.querySelector("[data-slot='avatar']");
	expect(avatar).not.toBeNull();
	expect(avatar?.className).toContain("custom");
});

test("renders the fallback with its data-slot when the image has not loaded", () => {
	render(
		<Avatar>
			<AvatarImage src="https://example.com/avatar.png" alt="Dougal Graham" />
			<AvatarFallback>DG</AvatarFallback>
		</Avatar>,
	);
	const fallback = screen.getByText("DG");
	expect(fallback.dataset.slot).toBe("avatar-fallback");
});
