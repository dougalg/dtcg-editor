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
 * expand/collapse state (research.md §5). It also closes a real a11y
 * gap: the previous `<button>` toggle exposed neither `aria-expanded`
 * nor `aria-controls`; `<summary>` supplies disclosure semantics and
 * keyboard operability natively.
 *
 * Native browser auto-expansion of a closed `<details>` on fragment
 * navigation is real, but this app never actually exercises it: every
 * in-app jump goes through Next.js's `<Link>`, which reaches a same-page
 * fragment via `history.pushState`, not a real browser fragment
 * navigation (confirmed during T050's implementation — see
 * `useTokenArrival.ts`), and an initial page load always renders every
 * `<details open>` regardless, so there's never a collapsed group for a
 * fresh navigation to auto-expand into either way. `useTokenArrival.ts`
 * does the actual work — walking up from the arrival target and setting
 * `.open = true` on every ancestor `<details>` — using nothing more
 * exotic than the standard `HTMLDetailsElement.open` setter, universally
 * supported and not a source of real cross-browser risk.
 *
 * Two constraints this relies on, both load-bearing, not stylistic:
 *
 * 1. `<details>` MUST stay uncontrolled — no `open` prop is ever passed a
 *    changing value. `open` is written once, in the initial markup, and
 *    never re-specified; the DOM (including `useTokenArrival.ts`'s own
 *    later mutation of it, and a user's manual click to collapse it)
 *    owns it from then on. Passing a changing `open` prop would make
 *    React re-assert it on every render and silently defeat both.
 * 2. The group-name `Input` lives **outside** `<details>`, and `<summary>`
 *    carries only the disclosure control. Putting the `Input` inside
 *    `<summary>` would be nested interactive content (Space toggles the
 *    group instead of typing a space into the name); putting it inside
 *    `<details>` but after `<summary>` would make it unreachable while
 *    collapsed.
 *
 * Not `design-system`'s `Accordion`: that component is Radix's
 * state-driven accordion primitive, not a wrapper over native
 * `<details>`/`<summary>`. Swapping to it would still need the same
 * `useTokenArrival.ts`-driven manual open (Radix state management
 * doesn't get that for free either), but would give up `<summary>`'s
 * native keyboard operability and disclosure semantics for Radix's own
 * re-implementation of them — the DTCG spec-driven navigation
 * requirement (research.md §5) overrides
 * DESIGN.md/constitution Principle XII's general component-reuse rule.
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
