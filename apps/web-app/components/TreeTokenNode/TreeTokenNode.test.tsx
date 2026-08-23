import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeTokenNode } from "./TreeTokenNode.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

function token(overrides: Partial<TokenNode> = {}): TokenNode {
	return {
		kind: "token",
		name: "small",
		path: ["small"],
		value: { value: 4, unit: "px" },
		declaredType: "dimension",
		effectiveType: "dimension",
		description: undefined,
		deprecated: undefined,
		...overrides,
	};
}

const root: PlainDtcgNode = {
	kind: "group",
	name: "",
	path: [],
	declaredType: undefined,
	effectiveType: undefined,
	description: undefined,
	deprecated: undefined,
	children: [],
};

test("a valid dimension token renders its resolved built-in editor (path 1)", () => {
	render(
		<TreeTokenNode
			node={token()}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect(screen.getByLabelText("small name")).toBeTruthy();
	expect(screen.getByLabelText("Value")).toBeTruthy();
});

test("a standard type with no built-in editor renders the fallback JSON editor (path 2)", () => {
	render(
		<TreeTokenNode
			node={token({
				name: "swatch",
				path: ["swatch"],
				value: { r: 255, g: 0, b: 0 },
				declaredType: "fontWeight",
				effectiveType: "fontWeight",
			})}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect(screen.getByLabelText("Value (JSON)")).toBeTruthy();
});

test("an invalid dimension value renders DefaultValidationErrorHandler (path 4)", () => {
	render(
		<TreeTokenNode
			node={token({ value: { value: 4 } })}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect(screen.getByLabelText("small name")).toBeTruthy();
	expect(screen.getByRole("alert").textContent).toMatch(
		/Invalid dimension value/,
	);
});

test("a non-standard type renders read-only with no error alert (path 5)", () => {
	render(
		<TreeTokenNode
			node={token({
				value: "#ff0000",
				declaredType: "not-a-real-type",
				effectiveType: "not-a-real-type",
			})}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect(screen.getByLabelText("small name")).toBeTruthy();
	expect(screen.getByText("#ff0000")).toBeTruthy();
	expect(screen.queryByRole("alert")).toBeNull();
});

test("renaming to an available name stages the edit", () => {
	const onStageEdit = vi.fn();
	const onFieldError = vi.fn();
	const siblingRoot: PlainDtcgNode = {
		...root,
		children: [token(), token({ name: "large", path: ["large"] })],
	};

	render(
		<TreeTokenNode
			node={token()}
			root={siblingRoot}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={onStageEdit}
			onFieldError={onFieldError}
		/>,
	);

	fireEvent.change(screen.getByLabelText("small name"), {
		target: { value: "tiny" },
	});

	expect(onStageEdit).toHaveBeenCalledWith(["small"], { name: "tiny" });
});

test("renaming to a colliding sibling name is rejected without staging", () => {
	const onStageEdit = vi.fn();
	const siblingRoot: PlainDtcgNode = {
		...root,
		children: [token(), token({ name: "large", path: ["large"] })],
	};

	render(
		<TreeTokenNode
			node={token()}
			root={siblingRoot}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={onStageEdit}
			onFieldError={vi.fn()}
		/>,
	);

	fireEvent.change(screen.getByLabelText("small name"), {
		target: { value: "large" },
	});

	expect(onStageEdit).not.toHaveBeenCalled();
});

test("editing the description stages a description-only edit", () => {
	const onStageEdit = vi.fn();
	render(
		<TreeTokenNode
			node={token()}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={onStageEdit}
			onFieldError={vi.fn()}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Description"), {
		target: { value: "Base spacing unit" },
	});

	expect(onStageEdit).toHaveBeenCalledWith(["small"], {
		description: "Base spacing unit",
	});
});
