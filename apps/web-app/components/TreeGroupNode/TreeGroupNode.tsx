"use client";

import { Input } from "@dtcg-editor/design-system/components/Input/Input.tsx";
import { Label } from "@dtcg-editor/design-system/components/Label/Label.tsx";
import type { ChangeEvent } from "react";
import {
	applyEditsToPlainNode,
	checkRenameAvailable,
	findSiblings,
} from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import styles from "../TokenTree/TokenTree.module.css";
import { TreeNode, type TreeNodeProps } from "../TreeNode/TreeNode.tsx";

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

type GroupNode = Extract<PlainDtcgNode, { kind: "group" }>;

/**
 * Group rename and recursion into `node.children`, via a native
 * `<details>`/`<summary>` disclosure rather than React-managed
 * expand/collapse state (research.md §5). This is what gives User Story
 * 2's arrival a collapsed group opened for free: browsers auto-expand a
 * closed `<details>` when navigating to a fragment inside it (Chrome,
 * Firefox 139+, Safari 26.2+ — verified through this app's own Next.js
 * navigation). It also closes a real a11y gap: the previous `<button>`
 * toggle exposed neither `aria-expanded` nor `aria-controls`; `<summary>`
 * supplies disclosure semantics and keyboard operability natively.
 *
 * Two constraints this relies on, both load-bearing, not stylistic:
 *
 * 1. `<details>` MUST stay uncontrolled — no `open` prop is ever passed a
 *    changing value. `open` is written once, in the initial markup, and
 *    never re-specified; the DOM (and the browser's own auto-expansion)
 *    owns it from then on. Passing a changing `open` prop would make React
 *    re-assert it on every render and silently defeat arrival.
 * 2. The group-name `Input` lives **outside** `<details>`, and `<summary>`
 *    carries only the disclosure control. Putting the `Input` inside
 *    `<summary>` would be nested interactive content (Space toggles the
 *    group instead of typing a space into the name); putting it inside
 *    `<details>` but after `<summary>` would make it unreachable while
 *    collapsed.
 */
export function TreeGroupNode({
	node,
	root,
	relativePath,
	pendingEdits,
	fieldErrors,
	onStageEdit,
	onFieldError,
}: TreeNodeProps<GroupNode>) {
	const isRoot = node.path.length === 0;
	const groupKey = pathKey(node.path);
	const groupPending = pendingEdits.get(groupKey);
	const groupErrors = fieldErrors.get(groupKey);
	const currentGroupName = groupPending?.name ?? node.name;

	function handleGroupNameChange(event: ChangeEvent<HTMLInputElement>) {
		const nextName = event.target.value;
		if (nextName.trim().length === 0) {
			onFieldError(node.path, {
				name: "Name cannot be empty",
				value: undefined,
			});
			return;
		}
		// Reflects other groups'/tokens' staged-but-unsaved renames too, so
		// freeing up a name via one pending edit lets another pending edit
		// claim it in the same session — mirrors `TreeTokenNode`'s
		// `handleNameChange`.
		const effectiveRoot = applyEditsToPlainNode(
			root,
			Array.from(pendingEdits.values()),
		);
		const siblings = findSiblings(effectiveRoot, node.path);
		if (!checkRenameAvailable(siblings, nextName, node.name)) {
			onFieldError(node.path, {
				name: `"${nextName}" already exists here`,
				value: undefined,
			});
			return;
		}
		onFieldError(node.path, { name: undefined, value: undefined });
		onStageEdit(node.path, { name: nextName });
	}

	function renderChildren(listClassName: string | undefined) {
		return (
			<ul className={listClassName}>
				{node.children.map((child) => (
					<TreeNode
						key={child.path.join(".")}
						node={child}
						root={root}
						relativePath={relativePath}
						pendingEdits={pendingEdits}
						fieldErrors={fieldErrors}
						onStageEdit={onStageEdit}
						onFieldError={onFieldError}
					/>
				))}
			</ul>
		);
	}

	if (isRoot) {
		return renderChildren(styles.root);
	}

	return (
		<li className={styles.group}>
			<Label className={styles.groupNameField}>
				Group Name:
				<Input
					type="text"
					value={currentGroupName}
					onChange={handleGroupNameChange}
					data-inline
				/>
			</Label>
			{groupErrors?.name !== undefined && (
				<span role="alert">{groupErrors.name}</span>
			)}
			<details open>
				<summary
					className={styles.summary}
					aria-label={`Toggle ${node.name || "/"}`}
				>
					<span aria-hidden="true" className={styles.marker} />
				</summary>
				{renderChildren(styles.children)}
			</details>
		</li>
	);
}
