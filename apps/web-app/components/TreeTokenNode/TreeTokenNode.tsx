"use client";

import { isDtcgTokenType } from "@dtcg-editor/token-core";
import {
	type TokenTypeEditorProps,
	validateTokenValue,
} from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent, ReactElement } from "react";
import { resolveBuiltInContract } from "../../lib/token-editors/built-in.ts";
import { resolveEditorForType } from "../../lib/token-editors/resolve-editor.ts";
import dtcgEditorConfig from "../../lib/token-editors/user-config.ts";
import {
	applyEditsToPlainNode,
	checkRenameAvailable,
	findSiblings,
} from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { DefaultValidationErrorHandler } from "../DefaultValidationErrorHandler/DefaultValidationErrorHandler.tsx";
import { FallbackValueEditor } from "../FallbackValueEditor/FallbackValueEditor.tsx";
import styles from "../TokenBlock/TokenBlock.module.css";
import { TokenBlock } from "../TokenBlock/TokenBlock.tsx";
import type { TreeNodeProps } from "../TreeNode/TreeNode.tsx";

function formatValue(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

/**
 * The editable/read-only dispatch for a single token — the entire "5-path
 * model" from plan.md's "TreeNode.tsx dispatch design":
 *
 * 1. Valid value, registered editor -> render the editor.
 * 2. Valid value, no registered editor -> render `FallbackValueEditor`.
 * 3. Recognized type, invalid value, package `ValidationErrorHandler` -> render it.
 * 4. Recognized type, invalid value, no package handler -> `DefaultValidationErrorHandler` (with `error`).
 * 5. No usable type -> `DefaultValidationErrorHandler` (without `error`).
 */
export function TreeTokenNode({
	node,
	root,
	pendingEdits,
	fieldErrors,
	onStageEdit,
	onFieldError,
}: TreeNodeProps<TokenNode>) {
	const key = pathKey(node.path);
	// Shared with the Description field below via `aria-labelledby` so its
	// accessible name combines the token's (live-edited) name with the field
	// label (e.g. "0 Description"), disambiguating same-named fields across
	// sibling tokens. Also used as a stable `data-testid` on the row, since
	// the heading text itself is no longer stable once it's editable.
	const headingId = `token-${key}-heading`;
	const rowTestId = `token-${key}`;
	const pending = pendingEdits.get(key);
	const errors = fieldErrors.get(key);
	const effectiveType = node.effectiveType;

	const currentName = pending?.name ?? node.name;

	// Renaming is independent of the token's value/type validity, so this is
	// shared by both the valid/editable and invalid/read-only paths below —
	// a token with a broken value can still be renamed.
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

	// A type is only "usable" for validation purposes when it's both present
	// and a recognized standard DTCG type — a declared-but-unrecognized type
	// and an entirely absent effectiveType are treated identically (path 5).
	const isUsableType =
		effectiveType !== undefined && isDtcgTokenType(effectiveType);
	const contract = isUsableType
		? resolveBuiltInContract(effectiveType)
		: undefined;
	const validation = contract
		? validateTokenValue(contract, node.value)
		: undefined;
	// A standard type with no built-in contract has nothing to validate
	// against, so it's trusted as-is.
	const isValid =
		isUsableType && (contract === undefined || validation?.isOk());
	const { editor: resolvedEditor, editorOptions: resolvedEditorOptions } =
		(isUsableType
			? resolveEditorForType(dtcgEditorConfig.extensions, effectiveType)
			: undefined) ?? {};

	if (!isValid) {
		const errorForHandler =
			validation?.isErr() === true ? validation.error : undefined;
		// `errorForHandler` is guaranteed defined whenever `contract` is
		// defined (per `isValid`'s formula: `contract` defined + `!isValid`
		// implies `validation.isErr()`), so calling `ValidationErrorHandler`
		// with it is safe — narrowed via the `!== undefined` check below
		// rather than a `??`-merged component reference, since
		// `ValidationErrorHandler`'s `error` is required while
		// `DefaultValidationErrorHandler`'s is optional.
		const extraContent =
			contract?.ValidationErrorHandler !== undefined &&
			errorForHandler !== undefined
				? contract.ValidationErrorHandler({
						value: node.value,
						error: errorForHandler,
					})
				: DefaultValidationErrorHandler({
						value: node.value,
						error: errorForHandler,
					});

		return (
			<TokenBlock
				name={currentName}
				onNameChange={handleNameChange}
				nameAriaLabel={`${node.name} name`}
				headingId={headingId}
				rowTestId={rowTestId}
				type={effectiveType}
				isNonStandardType={effectiveType !== undefined && !isUsableType}
			>
				<span className={styles.field}>
					<span className={styles.fieldLabel}>Value</span>
					<span className={styles.value}>{formatValue(node.value)}</span>
				</span>
				{extraContent}
				{errors?.name !== undefined && <span role="alert">{errors.name}</span>}
			</TokenBlock>
		);
	}

	const currentRawValue = pending?.value ?? node.value;
	const currentDescription = pending?.description ?? node.description ?? "";

	// Validates the next value against the resolved built-in contract (if
	// any) before staging, blocking the stage and calling `onFieldError`
	// on failure — applies uniformly to every standard type with a
	// built-in contract (dimension, color, ...). A standard type with no
	// built-in contract, or a non-standard type, has nothing to validate
	// against, so the value is trusted as-is, matching the existing
	// generic-editor design.
	function handleValueChange(next: unknown) {
		if (contract) {
			const nextValidation = validateTokenValue(contract, next);
			if (nextValidation.isErr()) {
				onFieldError(node.path, {
					name: errors?.name,
					value: nextValidation.error.message,
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

	function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
		onStageEdit(node.path, { description: event.target.value });
	}

	const ResolvedEditor = resolvedEditor as
		| ((props: TokenTypeEditorProps<unknown>) => ReactElement)
		| undefined;

	const descriptionLabelId = `token-${key}-description-label`;

	return (
		<TokenBlock
			name={currentName}
			onNameChange={handleNameChange}
			nameAriaLabel={`${node.name} name`}
			headingId={headingId}
			rowTestId={rowTestId}
			type={effectiveType}
			isNonStandardType={false}
		>
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
			<label className={styles.descriptionField}>
				<span id={descriptionLabelId} className={styles.fieldLabel}>
					Description
				</span>
				<textarea
					aria-labelledby={`${headingId} ${descriptionLabelId}`}
					className={styles.descriptionTextarea}
					rows={1}
					value={currentDescription}
					onChange={handleDescriptionChange}
				/>
			</label>
			{errors?.name !== undefined && <span role="alert">{errors.name}</span>}
			{errors?.value !== undefined && <span role="alert">{errors.value}</span>}
		</TokenBlock>
	);
}
