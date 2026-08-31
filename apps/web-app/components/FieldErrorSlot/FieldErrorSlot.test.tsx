import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import type { FieldErrors } from "../../lib/tokens/staged-edits-store.ts";
import { FieldErrorSlot } from "./FieldErrorSlot.tsx";

const NO_ERRORS: FieldErrors = { name: undefined, value: undefined };

function slot(container: Element): Element | null {
	return container.querySelector("[data-testid='field-error-slot']");
}

test("always renders its reserving box, whether or not a message is present (U60)", () => {
	const { container: empty } = render(<FieldErrorSlot errors={NO_ERRORS} />);
	const { container: withMessage } = render(
		<FieldErrorSlot
			errors={{ name: "The name is taken.", value: undefined }}
		/>,
	);

	// the reserving element and its markup are unconditional — its `min-height`
	// is reserved in CSS so nothing about the box changes when a message
	// appears (the pixel-height equality is asserted end to end by A2 /
	// render-stability.spec.ts).
	expect(slot(empty)).not.toBeNull();
	expect(slot(withMessage)).not.toBeNull();
	expect(slot(withMessage)?.className).toBe(slot(empty)?.className);
});

test("renders each set error as a role=alert message inside the reserved box (U61)", () => {
	const { container } = render(
		<FieldErrorSlot errors={{ name: "Name taken.", value: "Bad value." }} />,
	);
	const box = slot(container);
	expect(box).not.toBeNull();
	const alerts = box ? Array.from(box.querySelectorAll('[role="alert"]')) : [];

	expect(alerts.map((a) => a.textContent)).toEqual([
		"Name taken.",
		"Bad value.",
	]);
	// every alert is a descendant of the reserved box (not a sibling that could
	// displace surrounding content)
	for (const alert of alerts) {
		expect(box?.contains(alert)).toBe(true);
	}
});

test("a long multi-line message is added inside the box without changing the box itself (U62)", () => {
	const short = "Taken.";
	const long =
		"This name collides with a sibling token in this group. Pick a different name — token names must be unique among their siblings so a reference like {group.name} resolves unambiguously.";

	const { container: a } = render(
		<FieldErrorSlot errors={{ name: short, value: undefined }} />,
	);
	const { container: b } = render(
		<FieldErrorSlot errors={{ name: long, value: undefined }} />,
	);

	const boxA = slot(a);
	const boxB = slot(b);
	// the box's own markup / class is unchanged — the longer message is added
	// *inside* it (normal block flow), so it grows the box downward only; it
	// never becomes a sibling that could push content above it. The pixel-level
	// "no upward shift" is asserted end to end by A2 / render-stability.spec.ts.
	expect(boxB?.className).toBe(boxA?.className);
	const alertB = boxB?.querySelector('[role="alert"]');
	expect(alertB?.textContent).toBe(long);
	expect(boxB?.contains(alertB ?? null)).toBe(true);
});
