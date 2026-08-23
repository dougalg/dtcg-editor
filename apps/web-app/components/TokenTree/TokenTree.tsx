"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@dtcg-editor/design-system/components/Dialog/Dialog.tsx";
import { useEffect, useRef, useState } from "react";
import { useSaveTokenEdits } from "../../hooks/useSaveTokenEdits.ts";
import { useTokenArrival } from "../../hooks/useTokenArrival.ts";
import type { ClientEdit } from "../../lib/tokens/edit-state.ts";
import { applyEditsToPlainNode } from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { SaveError } from "../../lib/tokens/save-error.ts";
import { isSameFileHref } from "../../lib/tokens/token-fragment.ts";
import { SaveButton } from "../SaveButton/SaveButton.tsx";
import {
	type EditablePatch,
	type FieldErrors,
	TreeNode,
} from "../TreeNode/TreeNode.tsx";
import styles from "./TokenTree.module.css";

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
	navigate = (href: string) => {
		window.location.assign(href);
	},
}: {
	node: PlainDtcgNode;
	relativePath: string;
	/** Injected per Principle VI: `window.location.assign` is non-configurable
	 * in jsdom, so a real default plus this parameter is what lets tests
	 * observe a guarded navigation without fighting the platform. */
	navigate?: (href: string) => void;
}) {
	const [treeState, setTreeState] = useState(node);
	const [pendingEdits, setPendingEdits] = useState<Map<string, ClientEdit>>(
		new Map(),
	);
	const [fieldErrors, setFieldErrors] = useState<Map<string, FieldErrors>>(
		new Map(),
	);
	const { saveState, saveError, save } = useSaveTokenEdits(relativePath);
	useTokenArrival();
	const containerRef = useRef<HTMLDivElement>(null);
	// The href of a cross-file navigation the user just attempted, held
	// while the unsaved-edits dialog asks what to do with it — undefined
	// means no guarded navigation is pending, which also doubles as "the
	// dialog is closed".
	const [guardedHref, setGuardedHref] = useState<string | undefined>(undefined);

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
		return succeeded;
	}

	const hasPendingEdits = pendingEdits.size > 0;

	// Intercepts a click on any cross-file navigation control (a reference
	// link, a definition-picker entry, a referrer link — anything rendered
	// deep in the tree) while edits are unsaved (spec FR-018). A capture-
	// phase native listener is what makes this possible at all: Next.js's
	// `Link` handles the click itself during the bubble phase, so
	// intercepting has to happen before that, not after. A same-file
	// fragment jump is never intercepted — nothing is at risk, and
	// interrupting the common case would make the feature feel obstructive
	// (contracts/token-addressing-and-navigation.md).
	useEffect(() => {
		const container = containerRef.current;
		if (container === null) {
			return;
		}

		function handleClickCapture(event: MouseEvent) {
			if (!hasPendingEdits) {
				return;
			}
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}
			const anchor = target.closest("a");
			if (anchor === null) {
				return;
			}
			const href = anchor.getAttribute("href");
			if (href === null || isSameFileHref(href, relativePath)) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			setGuardedHref(href);
		}

		container.addEventListener("click", handleClickCapture, true);
		return () => {
			container.removeEventListener("click", handleClickCapture, true);
		};
	}, [hasPendingEdits, relativePath]);

	async function handleSaveAndGo() {
		if (guardedHref === undefined) {
			return;
		}
		const succeeded = await handleSave();
		if (succeeded) {
			const href = guardedHref;
			setGuardedHref(undefined);
			// A plain browser navigation, not `next/navigation`'s router: this
			// only fires from inside the confirmation dialog (already an
			// interruption of the normal, client-side-transitioned `Link`
			// click), and avoids requiring an App Router context that a unit
			// test rendering `TokenTree` in isolation has no reason to provide.
			navigate(href);
		}
		// On failure, leave the dialog open — `saveState`/`saveError` below
		// already surface why, same as a normal (non-navigating) save.
	}

	function handleDiscardAndGo() {
		if (guardedHref === undefined) {
			return;
		}
		const href = guardedHref;
		setPendingEdits(new Map());
		setGuardedHref(undefined);
		navigate(href);
	}

	function handleStay() {
		setGuardedHref(undefined);
	}

	return (
		<div ref={containerRef}>
			<TreeNode
				node={treeState}
				root={treeState}
				relativePath={relativePath}
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
			<Dialog
				open={guardedHref !== undefined}
				onOpenChange={(open) => {
					if (!open) {
						handleStay();
					}
				}}
			>
				<DialogContent>
					<DialogTitle>Unsaved changes</DialogTitle>
					<DialogDescription>
						You have unsaved edits in this file. Save them before leaving,
						discard them, or stay here.
					</DialogDescription>
					<div className={styles.dialogActions}>
						<button type="button" onClick={handleSaveAndGo}>
							Save and leave
						</button>
						<button type="button" onClick={handleDiscardAndGo}>
							Discard and leave
						</button>
						<button type="button" onClick={handleStay}>
							Stay
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
