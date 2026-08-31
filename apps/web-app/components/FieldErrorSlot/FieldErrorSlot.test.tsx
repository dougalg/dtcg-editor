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
