"use client";

import { isDtcgTokenType, parseReference } from "@dtcg-editor/token-core";
import {
	type TokenTypeEditorProps,
	validateTokenValue,
} from "@dtcg-editor/token-editor-contract";
import {
	type ChangeEvent,
	type ReactElement,
	useContext,
	useState,
} from "react";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import { useTokenSlice } from "../../hooks/useTokenSlice.ts";
import { resolveBuiltInContract } from "../../lib/token-editors/built-in.ts";
import { resolveEditorForType } from "../../lib/token-editors/resolve-editor.ts";
import dtcgEditorConfig from "../../lib/token-editors/user-config.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { EditableFields } from "../../lib/tokens/staged-edits-store.ts";
import { DefaultValidationErrorHandler } from "../DefaultValidationErrorHandler/DefaultValidationErrorHandler.tsx";
import { FallbackValueEditor } from "../FallbackValueEditor/FallbackValueEditor.tsx";
import { ReferencedByBadge } from "../ReferencedByBadge/ReferencedByBadge.tsx";
import styles from "../TokenBlock/TokenBlock.module.css";
import { TokenBlock } from "../TokenBlock/TokenBlock.tsx";
import { TokenReferenceValue } from "../TokenReferenceValue/TokenReferenceValue.tsx";
import type { TreeNodeProps } from "../TreeNode/TreeNode.tsx";
import { TypeSuggestion } from "../TypeSuggestion/TypeSuggestion.tsx";

function formatValue(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

/**
 * The editable/read-only dispatch for a single token — plan.md's
 * "TreeNode.tsx dispatch design", now six paths rather than five:
 *
 * 1. Value is a reference -> render the reference view, never
 *    `validateTokenValue` (a reference is valid for any `$type` per the
 *    DTCG spec, so it is never that type's business to validate — see
 *    contracts/reference-validation.md). Checked first, ahead of every
 *    other path.
 * 2. Valid value, registered editor -> render the editor.
 * 3. Valid value, no registered editor -> render `FallbackValueEditor`.
 * 4. Recognized type, invalid value, package `ValidationErrorHandler` -> render it.
 * 5. Recognized type, invalid value, no package handler -> `DefaultValidationErrorHandler` (with `error`).
 * 6. No usable type -> `DefaultValidationErrorHandler` (without `error`).
 *
 * Edit state is the `StagedEditsStore`'s: `useTokenSlice(key)` gives this row
 * its merged `fields`, its `error`, and a `commit` bound to `key`. Every field
 * change commits straight through (the local-`draft` buffering that INV-9..12
 * calls for lands in a later step).
 */
export function TreeTokenNode({
	node,
	relativePath,
}: TreeNodeProps<TokenNode>) {
	const key = pathKey(node.path);
	const store = useContext(StagedEditsContext);
	const { fields, error, commit } = useTokenSlice(key);
	// A keystroke updates only this local buffer — no store call, no
	// validation, no re-subscribe (INV-9). The staged edit is produced on
	// blur / Enter by `commitDraft`. `shown` is what every field renders from.
	const [draft, setDraft] = useState<Partial<EditableFields>>({});
	const shown = { ...fields, ...draft };

	function commitDraft() {
		if (Object.keys(draft).length === 0) {
			return;
		}
		commit(draft);
		setDraft({});
	}
	// Rendered in every dispatch path below via `TokenBlock`'s `headerExtra`
	// — `ReferencedByBadge` itself renders nothing at zero referrers, so no
	// conditional is needed here (spec FR-021).
	const referencedByBadge = (
		<ReferencedByBadge
			referencedBy={node.referencedBy ?? []}
			currentFile={relativePath}
		/>
	);
	// Shared with the Description field below via `aria-labelledby` so its
	// accessible name combines the token's (live-edited) name with the field
	// label (e.g. "0 Description"), disambiguating same-named fields across
	// sibling tokens. Also used as a stable `data-testid` on the row, since
	// the heading text itself is no longer stable once it's editable.
	const headingId = `token-${key}-heading`;
	const rowTestId = `token-${key}`;
	const effectiveType = node.effectiveType;

	const currentName = shown.name;

	// Renaming is independent of the token's value/type validity, so this is
	// shared by both the valid/editable and invalid/read-only paths below —
	// a token with a broken value can still be renamed. Collision validation
	// (against other pending renames too) happens in the store's `commit`,
	// reached from `commitDraft` on blur.
	function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
		const nextName = event.target.value;
		setDraft((current) => ({ ...current, name: nextName }));
	}

	// Path 1: the value is a reference. Checked before any per-type
	// validation runs — a reference is valid for every `$type` (per the
	// DTCG spec, an aliasing token's type is its target's resolved type),
	// so `validateTokenValue` is never called for it at all, not merely
	// ignored. `node.references[0]` is this specific whole-value
	// reference's own resolution — `at: []` — computed once, server-side,
	// in `buildReferenceView` (the live `useResolvedPreview` swap is a
	// later step).
	const reference = parseReference(fields.value);
	if (reference !== undefined) {
		const resolved = node.references?.[0];
		return (
			<TokenBlock
				name={currentName}
				onNameChange={handleNameChange}
				onNameBlur={commitDraft}
				nameAriaLabel={`${node.name} name`}
				headingId={headingId}
				rowTestId={rowTestId}
				type={effectiveType}
				isNonStandardType={false}
				headerExtra={referencedByBadge}
			>
				<span className={styles.field}>
					<span className={styles.fieldLabel}>Value</span>
					{resolved !== undefined ? (
						<TokenReferenceValue resolved={resolved} />
					) : (
						<span className={styles.value}>{reference.raw}</span>
					)}
				</span>
				{error?.name !== undefined && <span role="alert">{error.name}</span>}
			</TokenBlock>
		);
	}

	// A type is only "usable" for validation purposes when it's both present
	// and a recognized standard DTCG type — a declared-but-unrecognized type
	// and an entirely absent effectiveType are treated identically (path 6).
	const isUsableType =
		effectiveType !== undefined && isDtcgTokenType(effectiveType);
	const contract = isUsableType
		? resolveBuiltInContract(effectiveType)
		: undefined;
	const validation = contract
		? validateTokenValue(contract, fields.value)
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
						value: fields.value,
						error: errorForHandler,
					})
				: DefaultValidationErrorHandler({
						value: fields.value,
						error: errorForHandler,
					});

		return (
			<TokenBlock
				name={currentName}
				onNameChange={handleNameChange}
				onNameBlur={commitDraft}
				nameAriaLabel={`${node.name} name`}
				headingId={headingId}
				rowTestId={rowTestId}
				type={effectiveType}
				isNonStandardType={effectiveType !== undefined && !isUsableType}
				headerExtra={referencedByBadge}
			>
				<span className={styles.field}>
					<span className={styles.fieldLabel}>Value</span>
					<span className={styles.value}>{formatValue(fields.value)}</span>
				</span>
				{extraContent}
				{error?.name !== undefined && <span role="alert">{error.name}</span>}
			</TokenBlock>
		);
	}

	const currentRawValue = fields.value;
	const currentDescription = shown.description;

	// The store's `commit` validates the next value against the resolved
	// built-in contract before staging — an invalid value sets the field
	// error and stages nothing, exactly as the inline check here used to.
	function handleValueChange(next: unknown) {
		commit({ value: next });
	}

	function handleFallbackValueChange(nextText: string) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(nextText);
		} catch (parseError) {
			store?.reportError(node.path.join("."), {
				name: error?.name,
				value: `Invalid JSON: ${parseError instanceof Error ? parseError.message : "could not parse"}`,
			});
			return;
		}
		commit({ value: parsed });
	}

	function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
		const nextDescription = event.target.value;
		setDraft((current) => ({ ...current, description: nextDescription }));
	}

	// Present only when this token's type came from shape inference, not a
	// declaration (node.inferredType, per plain-node.ts) — accepting it is
	// the only thing that ever writes an inferred type into the document
	// (FR-003b), via the same staged-edit mechanism. Hidden once a type
	// edit is staged (`fields.type` is then set) so the suggestion doesn't
	// linger after the user has acted on it.
	function handleAcceptInferredType(type: string) {
		commit({ type });
	}

	const ResolvedEditor = resolvedEditor as
		| ((props: TokenTypeEditorProps<unknown>) => ReactElement)
		| undefined;

	const descriptionLabelId = `token-${key}-description-label`;

	return (
		<TokenBlock
			name={currentName}
			onNameChange={handleNameChange}
			onNameBlur={commitDraft}
			nameAriaLabel={`${node.name} name`}
			headingId={headingId}
			rowTestId={rowTestId}
			type={effectiveType}
			isNonStandardType={false}
			headerExtra={referencedByBadge}
		>
			{node.inferredType !== undefined && fields.type === undefined && (
				<TypeSuggestion
					inferredType={node.inferredType}
					onAccept={handleAcceptInferredType}
				/>
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
					onBlur={commitDraft}
				/>
			</label>
			{error?.name !== undefined && <span role="alert">{error.name}</span>}
			{error?.value !== undefined && <span role="alert">{error.value}</span>}
		</TokenBlock>
	);
}
