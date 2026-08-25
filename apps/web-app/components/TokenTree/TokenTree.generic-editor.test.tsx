import { DTCG_TOKEN_TYPES } from "@dtcg-editor/token-core";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { BUILT_IN_TOKEN_TYPES } from "../../lib/token-editors/built-in.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";

/**
 * Proves FR-05's generalized "standard type with a registered editor" branch
 * for a type OTHER than dimension — today's only shipped built-in. No real
 * non-dimension token-type package exists yet, so this uses a synthetic
 * extension purely to prove the mechanism (`resolveEditorForType` already
 * resolves it; `TreeNode` must actually render it instead of always falling
 * back to `FallbackValueEditor`). Derived dynamically from `DTCG_TOKEN_TYPES`/
 * `BUILT_IN_TOKEN_TYPES`, not a hardcoded literal, per the NFR on test
 * resilience to future built-in editors. `vi.mock` is file-scoped, so this
 * lives in its own file rather than `TokenTree.override.test.tsx`, which
 * mocks a different `extensions` array.
 */
const typeWithoutBuiltIn = DTCG_TOKEN_TYPES.find(
	(type) => !(BUILT_IN_TOKEN_TYPES as readonly string[]).includes(type),
);
if (typeWithoutBuiltIn === undefined) {
	throw new Error(
		"expected at least one DTCG type with no built-in editor yet",
	);
}

vi.mock("../../lib/token-editors/user-config.ts", async () => {
	const { DTCG_TOKEN_TYPES } = await import("@dtcg-editor/token-core");
	const { BUILT_IN_TOKEN_TYPES } = await import(
		"../../lib/token-editors/built-in.ts"
	);
	const type = DTCG_TOKEN_TYPES.find(
		(candidate) =>
			!(BUILT_IN_TOKEN_TYPES as readonly string[]).includes(candidate),
	);
	return {
		default: {
			tokensDir: "/virtual/tokens",
			extensions: [
				{
					type,
					editor: (props: { value: unknown }) => (
						<span>Synthetic editor: {JSON.stringify(props.value)}</span>
					),
				},
			],
		},
	};
});

const { TokenTree } = await import("./TokenTree.tsx");

function tree(): PlainDtcgNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [
			{
				kind: "token",
				name: "swatch",
				path: ["swatch"],
				value: "#ff0000",
				declaredType: typeWithoutBuiltIn,
				effectiveType: typeWithoutBuiltIn,
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

test("renders a registered non-dimension editor instead of the generic JSON fallback", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	expect(screen.getByText(/Synthetic editor/)).toBeTruthy();
	expect(screen.queryByLabelText("Value (JSON)")).toBeNull();
});
