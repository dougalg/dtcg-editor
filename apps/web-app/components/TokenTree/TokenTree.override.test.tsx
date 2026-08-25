import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";

/**
 * `TokenTree.tsx` resolves editors through `../lib/token-editors/user-config.ts`
 * (a static import of the real `dtcg-editor.config.mts`), so proving a
 * user-supplied extension overrides the built-in `DimensionEditor` (AC-02)
 * needs that module mocked. Kept in its own file (rather than added to
 * `TokenTree.test.tsx`) since `vi.mock` is file-scoped — mixing it into the
 * main suite would mock the config for every other test there too.
 */
vi.mock("../../lib/token-editors/user-config.ts", () => ({
	default: {
		tokensDir: "/virtual/tokens",
		extensions: [
			{
				type: "dimension",
				editor: (props: { value: unknown }) => (
					<span>Custom dimension editor: {JSON.stringify(props.value)}</span>
				),
			},
		],
	},
}));

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
				name: "small",
				path: ["small"],
				value: { value: 4, unit: "px" },
				declaredType: "dimension",
				effectiveType: "dimension",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

test("renders a user-supplied extension's editor instead of the built-in DimensionEditor (AC-02)", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	expect(screen.getByText(/Custom dimension editor/)).toBeTruthy();
	expect(screen.queryByLabelText("Dimension value")).toBeNull();
});
