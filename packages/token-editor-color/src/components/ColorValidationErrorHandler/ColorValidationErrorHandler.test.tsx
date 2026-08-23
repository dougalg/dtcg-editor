import {
	TokenTypeValidationError,
	validateTokenValue,
} from "@dtcg-editor/token-editor-contract";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { colorTokenType } from "../../token-type.ts";
import { ColorValidationErrorHandler } from "./ColorValidationErrorHandler.tsx";

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

test("renders nothing when the raw value actually parses (no issues to report)", () => {
	// A value ColorValidationErrorHandler would never actually be given in
	// practice — TreeNode.tsx only renders it once ColorValueSchema has
	// already failed — but describeIssues derives entirely from `value`, not
	// `error`, so this exercises its empty-issues branch directly.
	const raw = { colorSpace: "srgb", components: [0.1, 0.2, 0.3] };
	const error = new TokenTypeValidationError("unused", []);
	render(<ColorValidationErrorHandler value={raw} error={error} />);
	expect(screen.queryByRole("alert")).toBeNull();
});
