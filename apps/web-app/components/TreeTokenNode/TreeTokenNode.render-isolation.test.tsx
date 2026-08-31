import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";

/**
 * "Changes stay local" (SC-004, C-RI-1): a keystroke in one row must re-render
 * that row and nothing else. `TokenBlock` is the row's outer shell, so a
 * render-counting spy on it — one call per row render — is the observable.
 * Its own file: `vi.mock` is file-scoped.
 */
vi.mock("../TokenBlock/TokenBlock.tsx", () => ({
	TokenBlock: vi.fn(
		({
			name,
			onNameChange,
			nameAriaLabel,
			rowTestId,
			children,
		}: {
			name: string;
			onNameChange: (event: unknown) => void;
			nameAriaLabel: string;
			rowTestId: string;
			children: unknown;
		}) => (
			<li data-testid={rowTestId}>
				{/* biome-ignore lint/a11y/noLabelWithoutControl: the input is the control */}
				<input
					aria-label={nameAriaLabel}
					value={name}
					onChange={(event) => onNameChange(event)}
				/>
				{children as never}
			</li>
		),
	),
}));

const { TokenBlock } = await import("../TokenBlock/TokenBlock.tsx");
const { TokenTree } = await import("../TokenTree/TokenTree.tsx");

function tree(): PlainDtcgNode {
	const token = (leaf: string): PlainDtcgNode => ({
		kind: "token",
		name: leaf,
		path: ["g", leaf],
		value: { value: 4, unit: "px" },
		declaredType: "dimension",
		effectiveType: "dimension",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	});
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
				kind: "group",
				name: "g",
				path: ["g"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [token("a"), token("b"), token("c")],
			},
		],
	};
}

function rendersOf(rowTestId: string): number {
	return (
		TokenBlock as unknown as { mock: { calls: [{ rowTestId: string }][] } }
	).mock.calls.filter(([props]) => props.rowTestId === rowTestId).length;
}

test("a keystroke in one row re-renders only that row — siblings do not re-render", () => {
	render(<TokenTree node={tree()} relativePath="a.json" />);

	// enter the dirty state first (the first commit legitimately flips the Save
	// button); from here on a keystroke in row a must touch nothing but row a.
	fireEvent.change(screen.getByLabelText("a name"), {
		target: { value: "a2" },
	});

	const aBefore = rendersOf("token-g.a");
	const bBefore = rendersOf("token-g.b");
	const cBefore = rendersOf("token-g.c");

	// the row's accessible name is derived from the base node, so it stays "a name"
	fireEvent.change(screen.getByLabelText("a name"), {
		target: { value: "a3" },
	});

	expect(rendersOf("token-g.a")).toBeGreaterThan(aBefore);
	expect(rendersOf("token-g.b")).toBe(bBefore);
	expect(rendersOf("token-g.c")).toBe(cBefore);
});
