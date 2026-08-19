"use client";

import { Input } from "@dtcg-editor/design-system/components/Input/Input.tsx";
import { Label } from "@dtcg-editor/design-system/components/Label/Label.tsx";
import type { ChangeEvent } from "react";
import { useState } from "react";
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

/** Group rename, expand/collapse, and recursion into `node.children`. */
export function TreeGroupNode({
	node,
	root,
	pendingEdits,
	fieldErrors,
	onStageEdit,
	onFieldError,
}: TreeNodeProps<GroupNode>) {
	const [expanded, setExpanded] = useState(true);

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

	if (isRoot) {
		return (
			<ul className={styles.root}>
				{node.children.map((child) => (
					<TreeNode
						key={child.path.join(".")}
						node={child}
						root={root}
						pendingEdits={pendingEdits}
						fieldErrors={fieldErrors}
						onStageEdit={onStageEdit}
						onFieldError={onFieldError}
					/>
				))}
			</ul>
		);
	}

	return (
		<li className={styles.group}>
			<button
				type="button"
				className={styles.toggle}
				onClick={() => setExpanded((value) => !value)}
				aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name || "/"}`}
			>
				{expanded ? "▾" : "▸"}
			</button>
			<Label>
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
			{expanded && (
				<ul className={styles.children}>
					{node.children.map((child) => (
						<TreeNode
							key={child.path.join(".")}
							node={child}
							root={root}
							pendingEdits={pendingEdits}
							fieldErrors={fieldErrors}
							onStageEdit={onStageEdit}
							onFieldError={onFieldError}
						/>
					))}
				</ul>
			)}
		</li>
	);
}
