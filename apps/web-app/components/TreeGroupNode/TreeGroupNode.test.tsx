import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeGroupNode } from "./TreeGroupNode.tsx";

type GroupNode = Extract<PlainDtcgNode, { kind: "group" }>;

function group(overrides: Partial<GroupNode> = {}): GroupNode {
	return {
		kind: "group",
		name: "spacing",
		path: ["spacing"],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [],
		...overrides,
	};
}

function rootGroup(children: readonly PlainDtcgNode[] = []): GroupNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children,
	};
}

const childToken: PlainDtcgNode = {
	kind: "token",
	name: "small",
	path: ["spacing", "small"],
	value: { value: 4, unit: "px" },
	declaredType: "dimension",
	effectiveType: "dimension",
	description: undefined,
	deprecated: undefined,
};

test("the root group renders its children directly, with no name input or toggle", () => {
	const node = rootGroup([childToken]);
	render(
		<TreeGroupNode
			node={node}
			root={node}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect(screen.queryByLabelText("Group Name:")).toBeNull();
	expect(screen.getByLabelText("small name")).toBeTruthy();
});

test("a non-root group renders an editable name input and toggles its children on click", () => {
	const node = group({ children: [childToken] });
	const root = rootGroup([node]);
	render(
		<TreeGroupNode
			node={node}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect((screen.getByLabelText("Group Name:") as HTMLInputElement).value).toBe(
		"spacing",
	);
	expect(screen.getByLabelText("small name")).toBeTruthy();

	fireEvent.click(screen.getByRole("button", { name: /collapse spacing/i }));
	expect(screen.queryByLabelText("small name")).toBeNull();

	fireEvent.click(screen.getByRole("button", { name: /expand spacing/i }));
	expect(screen.getByLabelText("small name")).toBeTruthy();
});

test("stages a rename when the new name is available among siblings", () => {
	const node = group();
	const root = rootGroup([node, group({ name: "colors", path: ["colors"] })]);
	const onStageEdit = vi.fn();
	const onFieldError = vi.fn();
	render(
		<TreeGroupNode
			node={node}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={onStageEdit}
			onFieldError={onFieldError}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Group Name:"), {
		target: { value: "gaps" },
	});

	expect(onFieldError).toHaveBeenCalledWith(["spacing"], {
		name: undefined,
		value: undefined,
	});
	expect(onStageEdit).toHaveBeenCalledWith(["spacing"], { name: "gaps" });
});

test("rejects a rename that collides with a sibling group, without staging it", () => {
	const node = group();
	const root = rootGroup([node, group({ name: "colors", path: ["colors"] })]);
	const onStageEdit = vi.fn();
	render(
		<TreeGroupNode
			node={node}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={onStageEdit}
			onFieldError={vi.fn()}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Group Name:"), {
		target: { value: "colors" },
	});

	expect(onStageEdit).not.toHaveBeenCalled();
});

test("rejects an empty/whitespace-only rename, without staging it", () => {
	const node = group();
	const root = rootGroup([node]);
	const onStageEdit = vi.fn();
	const onFieldError = vi.fn();
	render(
		<TreeGroupNode
			node={node}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={onStageEdit}
			onFieldError={onFieldError}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Group Name:"), {
		target: { value: "   " },
	});

	expect(onFieldError).toHaveBeenCalledWith(["spacing"], {
		name: "Name cannot be empty",
		value: undefined,
	});
	expect(onStageEdit).not.toHaveBeenCalled();
});

test("renders a field error passed in via fieldErrors as an alert", () => {
	const node = group();
	const root = rootGroup([node]);
	const fieldErrors = new Map([
		["spacing", { name: '"gaps" already exists here', value: undefined }],
	]);
	render(
		<TreeGroupNode
			node={node}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={fieldErrors}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);

	expect(screen.getByRole("alert").textContent).toMatch(/already exists/);
});
