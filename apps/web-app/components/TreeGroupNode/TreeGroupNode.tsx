"use client";

import { Input } from "@dtcg-editor/design-system/components/Input/Input.tsx";
import { Label } from "@dtcg-editor/design-system/components/Label/Label.tsx";
import { type ChangeEvent, useContext, useState } from "react";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import { useTokenSlice } from "../../hooks/useTokenSlice.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeNode, type TreeNodeProps } from "../TreeNode/TreeNode.tsx";
import styles from "./TreeGroupNode.module.css";

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
	relativePath,
}: TreeNodeProps<GroupNode>) {
	const isRoot = node.path.length === 0;
	const groupKey = pathKey(node.path);
	const store = useContext(StagedEditsContext);
	const { fields, error, commit } = useTokenSlice(groupKey);
	// A keystroke updates only this buffer (INV-9); the rename is staged on
	// blur by `commitGroupName`. Same pattern as `TreeTokenNode`'s `draft`.
	const [draftName, setDraftName] = useState<string | undefined>(undefined);
	const currentGroupName = draftName ?? fields.name;

	function handleGroupNameChange(event: ChangeEvent<HTMLInputElement>) {
		setDraftName(event.target.value);
	}

	function commitGroupName() {
		if (draftName === undefined) {
			return;
		}
		if (draftName.trim().length === 0) {
			store?.reportError(node.path.join("."), {
				name: "Name cannot be empty",
				value: undefined,
			});
			return;
		}
		if (commit({ name: draftName })) {
			setDraftName(undefined);
		}
	}

	if (isRoot) {
		return (
			<ul className={styles.root}>
				{node.children.map((child) => (
					<TreeNode
						key={child.path.join(".")}
						node={child}
						relativePath={relativePath}
					/>
				))}
			</ul>
		);
	}

	return (
		<li className={styles.group}>
			<Label className={styles.groupNameField}>
				Group Name:
				<Input
					type="text"
					value={currentGroupName}
					onChange={handleGroupNameChange}
					onBlur={commitGroupName}
					data-inline
				/>
			</Label>
			{error?.name !== undefined && <span role="alert">{error.name}</span>}
			<details open>
				<summary
					className={styles.summary}
					aria-label={`Toggle ${node.name || "/"}`}
				>
					<span aria-hidden="true" className={styles.marker} />
					<p>{node.name}</p>
				</summary>
				<ul className={styles.children}>
					{node.children.map((child) => (
						<TreeNode
							key={child.path.join(".")}
							node={child}
							relativePath={relativePath}
						/>
					))}
				</ul>
			</details>
		</li>
	);
}
