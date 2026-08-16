"use client";

import { useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import {
	validateTokenValue,
	type TokenTypeEditorProps,
} from "@dtcg-editor/token-type-contract";
import { isDtcgTokenType } from "@dtcg-editor/token-core";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";
import {
	applyEditsToPlainNode,
	checkRenameAvailable,
	findSiblings,
} from "../lib/tokens/edit-state.ts";
import type { ClientEdit } from "../lib/tokens/edit-state.ts";
import { FallbackValueEditor } from "./FallbackValueEditor.tsx";
import dtcgEditorConfig from "../lib/token-editors/user-config.ts";
import { resolveEditorForType } from "../lib/token-editors/resolve-editor.ts";
import { resolveBuiltInContract } from "../lib/token-editors/built-in.ts";
import styles from "./TokenTree.module.css";

function formatValue(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

export interface FieldErrors {
	readonly name: string | undefined;
	readonly value: string | undefined;
}

export type EditablePatch = Partial<
	Pick<ClientEdit, "name" | "value" | "description">
>;

export interface TreeNodeProps {
	readonly node: PlainDtcgNode;
	readonly root: PlainDtcgNode;
	readonly pendingEdits: ReadonlyMap<string, ClientEdit>;
	readonly fieldErrors: ReadonlyMap<string, FieldErrors>;
	readonly onStageEdit: (path: readonly string[], patch: EditablePatch) => void;
	readonly onFieldError: (path: readonly string[], errors: FieldErrors) => void;
}

export function TreeNode({
	node,
	root,
	pendingEdits,
	fieldErrors,
	onStageEdit,
	onFieldError,
}: TreeNodeProps) {
	const [expanded, setExpanded] = useState(true);

	if (node.kind === "token") {
		const key = pathKey(node.path);
		const pending = pendingEdits.get(key);
		const errors = fieldErrors.get(key);
		const effectiveType = node.effectiveType;
		const isStandard =
			effectiveType !== undefined && isDtcgTokenType(effectiveType);
		// A standard type is only editable if its value actually parses
		// against that type's own contract schema (when a built-in contract
		// exists for it). A standard type with no built-in contract (e.g. a
		// user-registered extension for a type with no schema) has nothing
		// to validate against, so its value is trusted as-is, matching the
		// existing generic-editor design.
		const builtInContract =
			isStandard && effectiveType !== undefined
				? resolveBuiltInContract(effectiveType)
				: undefined;
		const genericValueValidation = builtInContract
			? validateTokenValue(builtInContract, node.value)
			: undefined;
		const canEdit = genericValueValidation?.isOk() ?? isStandard;
		const { editor: resolvedEditor, editorOptions: resolvedEditorOptions } =
			(isStandard && effectiveType !== undefined
				? resolveEditorForType(dtcgEditorConfig.extensions, effectiveType)
				: undefined) ?? {};

		if (!canEdit) {
			// Safe: `!canEdit` with a defined `builtInContract` only occurs
			// when `genericValueValidation.isErr()` (per `canEdit`'s formula
			// above), so `.error` always exists here.
			const validationErrorHandler =
				genericValueValidation?.isErr() === true
					? builtInContract?.ValidationErrorHandler
					: undefined;

			return (
				<li className={styles.token}>
					<span className={styles.field}>
						<span className={styles.fieldLabel}>{node.name} name</span>
						<span className={styles.name}>{node.name}</span>
					</span>
					{effectiveType !== undefined && (
						<span className={styles.field}>
							<span className={styles.fieldLabel}>{node.name} type</span>
							<span className={styles.type}>
								{effectiveType}
								{!isStandard && (
									<span className={styles.nonStandard}> (non-standard)</span>
								)}
							</span>
						</span>
					)}
					<span className={styles.field}>
						<span className={styles.fieldLabel}>{node.name} value</span>
						<span className={styles.value}>{formatValue(node.value)}</span>
					</span>
					{validationErrorHandler !== undefined &&
						genericValueValidation?.isErr() === true &&
						validationErrorHandler({
							value: node.value,
							error: genericValueValidation.error,
						})}
				</li>
			);
		}

		const currentName = pending?.name ?? node.name;
		const currentRawValue = pending?.value ?? node.value;
		const currentDescription = pending?.description ?? node.description ?? "";

		function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
			const nextName = event.target.value;
			// Reflects other tokens' staged-but-unsaved renames too, so freeing up
			// a name via one pending edit lets another pending edit claim it in
			// the same session, without waiting for a save round-trip.
			const effectiveRoot = applyEditsToPlainNode(
				root,
				Array.from(pendingEdits.values()),
			);
			const siblings = findSiblings(effectiveRoot, node.path);
			if (!checkRenameAvailable(siblings, nextName, node.name)) {
				onFieldError(node.path, {
					name: `"${nextName}" already exists here`,
					value: errors?.value,
				});
				return;
			}
			onFieldError(node.path, { name: undefined, value: errors?.value });
			onStageEdit(node.path, { name: nextName });
		}

		// Validates the next value against the resolved built-in contract (if
		// any) before staging, blocking the stage and calling `onFieldError`
		// on failure — applies uniformly to every standard type with a
		// built-in contract (dimension, color, ...). A standard type with no
		// built-in contract, or a non-standard type, has nothing to validate
		// against, so the value is trusted as-is, matching the existing
		// generic-editor design.
		function handleValueChange(next: unknown) {
			if (builtInContract) {
				const validation = validateTokenValue(builtInContract, next);
				if (validation.isErr()) {
					onFieldError(node.path, {
						name: errors?.name,
						value: validation.error.message,
					});
					return;
				}
			}
			onFieldError(node.path, { name: errors?.name, value: undefined });
			onStageEdit(node.path, { value: next });
		}

		function handleFallbackValueChange(nextText: string) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(nextText);
			} catch (error) {
				onFieldError(node.path, {
					name: errors?.name,
					value: `Invalid JSON: ${error instanceof Error ? error.message : "could not parse"}`,
				});
				return;
			}
			onFieldError(node.path, { name: errors?.name, value: undefined });
			onStageEdit(node.path, { value: parsed });
		}

		function handleDescriptionChange(event: ChangeEvent<HTMLInputElement>) {
			onStageEdit(node.path, { description: event.target.value });
		}

		const ResolvedEditor = resolvedEditor as
			((props: TokenTypeEditorProps<unknown>) => ReactElement) | undefined;

		return (
			<li className={styles.token}>
				<label className={styles.field}>
					<span className={styles.fieldLabel}>{node.name} name</span>
					<input
						className={styles.name}
						value={currentName}
						onChange={handleNameChange}
					/>
				</label>
				{effectiveType !== undefined && (
					<span className={styles.field}>
						<span className={styles.fieldLabel}>{node.name} type</span>
						<span className={styles.type}>{effectiveType}</span>
					</span>
				)}
				{ResolvedEditor !== undefined ? (
					<ResolvedEditor
						value={currentRawValue}
						onChange={handleValueChange}
						options={resolvedEditorOptions}
					/>
				) : (
					<FallbackValueEditor
						value={JSON.stringify(currentRawValue, null, 2)}
						onChange={handleFallbackValueChange}
					/>
				)}
				<label className={styles.field}>
					<span className={styles.fieldLabel}>{node.name} description</span>
					<input
						className={styles.value}
						value={currentDescription}
						onChange={handleDescriptionChange}
					/>
				</label>
				{errors?.name !== undefined && <span role="alert">{errors.name}</span>}
				{errors?.value !== undefined && (
					<span role="alert">{errors.value}</span>
				)}
			</li>
		);
	}

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
		// claim it in the same session — mirrors `handleNameChange` above.
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
			{isRoot ? (
				<span className={styles.groupName}>{node.name || "/"}</span>
			) : (
				<label className={styles.field}>
					<span className={styles.fieldLabel}>{node.name} name</span>
					<input
						className={styles.groupName}
						value={currentGroupName}
						onChange={handleGroupNameChange}
					/>
				</label>
			)}
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
