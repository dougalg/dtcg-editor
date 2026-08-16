import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { validateTokenValue } from "@dtcg-editor/token-type-contract";
import {
	ColorValidationErrorHandler,
	colorTokenType,
} from "@dtcg-editor/token-type-color";

/**
 * Exercises `colorTokenType`'s `ValidationErrorHandler` directly, rather
 * than through `TreeNode.tsx` — this behavior lives entirely inside
 * `packages/token-type-color`, which has no JSX-capable test runner of its
 * own (`node --test` can't load `.tsx`), so `apps/web-app`'s Vitest/jsdom
 * setup is the nearest place that can render and interact with it. Covers
 * only the doesn't-parse-at-all case, per `TreeNode.tsx`'s contract with
 * `ValidationErrorHandler` — the valid-but-out-of-range case is `ColorEditor`'s
 * own concern (see `color-editor.test.tsx`).
 */

test("an unrecognized colorSpace produces a field-specific issue naming colorSpace", () => {
	const raw = { colorSpace: "not-a-space", components: [1, 2, 3] };
	const result = validateTokenValue(colorTokenType, raw);
	expect(result.isErr()).toBe(true);
	if (result.isErr()) {
		render(<ColorValidationErrorHandler value={raw} error={result.error} />);
		expect(screen.getByRole("alert").textContent).toMatch(/^colorSpace:/);
	}
});

test("a wrong-length components array produces a field-specific issue naming components", () => {
	const raw = { colorSpace: "srgb", components: [1, 2] };
	const result = validateTokenValue(colorTokenType, raw);
	expect(result.isErr()).toBe(true);
	if (result.isErr()) {
		render(<ColorValidationErrorHandler value={raw} error={result.error} />);
		expect(screen.getByRole("alert").textContent).toMatch(/^components:/);
	}
});

test("a malformed hex string produces a diagnostic issue, not the generic Zod message", () => {
	const raw = "not-a-hex-value";
	const result = validateTokenValue(colorTokenType, raw);
	expect(result.isErr()).toBe(true);
	if (result.isErr()) {
		render(<ColorValidationErrorHandler value={raw} error={result.error} />);
		expect(screen.getByRole("alert").textContent).toMatch(
			/must be a 6-digit hex string/,
		);
	}
});
