"use client";

import { useState } from "react";
import { useSaveTokenEdits } from "../../hooks/useSaveTokenEdits.ts";
import type { ClientEdit } from "../../lib/tokens/edit-state.ts";
import { applyEditsToPlainNode } from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { SaveError } from "../../lib/tokens/save-error.ts";
import { SaveButton } from "../SaveButton/SaveButton.tsx";
import { TokenTypeIconSprite } from "../TokenTypeIconSprite/TokenTypeIconSprite.tsx";
import {
	type EditablePatch,
	type FieldErrors,
	TreeNode,
} from "../TreeNode/TreeNode.tsx";

/** Renders a `SaveError` (see `hooks/useSaveTokenEdits.ts`) as a single display string. */
function describeSaveError(error: SaveError): string {
	switch (error.kind) {
		case "not-found":
			return `Token file not found: "${error.path}"`;
		case "validation":
		case "invalid-file":
			return error.issues.join(", ");
		case "unknown":
			return error.message;
	}
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

export function TokenTree({
	node,
	relativePath,
}: {
	node: PlainDtcgNode;
	relativePath: string;
}) {
	const [treeState, setTreeState] = useState(node);
	const [pendingEdits, setPendingEdits] = useState<Map<string, ClientEdit>>(
		new Map(),
	);
	const [fieldErrors, setFieldErrors] = useState<Map<string, FieldErrors>>(
		new Map(),
	);
	const { saveState, saveError, save } = useSaveTokenEdits(relativePath);

	function stageEdit(path: readonly string[], patch: EditablePatch) {
		const key = pathKey(path);
		setPendingEdits((prev) => {
			const next = new Map(prev);
			const existing = next.get(key) ?? { path };
			next.set(key, { ...existing, ...patch });
			return next;
		});
	}

	function setFieldError(path: readonly string[], errors: FieldErrors) {
		const key = pathKey(path);
		setFieldErrors((prev) => {
			const next = new Map(prev);
			if (errors.name !== undefined || errors.value !== undefined) {
				next.set(key, errors);
			} else {
				next.delete(key);
			}
			return next;
		});
	}

	async function handleSave() {
		const edits = Array.from(pendingEdits.values());
		const succeeded = await save(edits);
		if (succeeded) {
			setTreeState((current) => applyEditsToPlainNode(current, edits));
			setPendingEdits(new Map());
		}
	}

	const hasPendingEdits = pendingEdits.size > 0;

	return (
		<div>
			<TokenTypeIconSprite />
			<TreeNode
				node={treeState}
				root={treeState}
				pendingEdits={pendingEdits}
				fieldErrors={fieldErrors}
				onStageEdit={stageEdit}
				onFieldError={setFieldError}
			/>
			<SaveButton
				onClick={handleSave}
				disabled={!hasPendingEdits || saveState === "pending"}
				pending={saveState === "pending"}
			/>
			{saveState === "error" && saveError !== undefined && (
				<p role="alert">{describeSaveError(saveError)}</p>
			)}
		</div>
	);
}
