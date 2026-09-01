"use client";

import { isDtcgTokenType, parseReference } from "@dtcg-editor/token-core";
import {
	type TokenTypeEditorProps,
	validateTokenValue,
} from "@dtcg-editor/token-editor-contract";
import {
	type ChangeEvent,
	type FocusEvent,
	type ReactElement,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { useResolvedPreview } from "../../hooks/useResolvedPreview.ts";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import { useTokenSlice } from "../../hooks/useTokenSlice.ts";
import { resolveBuiltInContract } from "../../lib/token-editors/built-in.ts";
import { resolveEditorForType } from "../../lib/token-editors/resolve-editor.ts";
import dtcgEditorConfig from "../../lib/token-editors/user-config.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
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
 * The reference row's resolved-value display. Its own component so
 * `useResolvedPreview` is called **only** by reference rows (data-model §7) —
 * a literal row never mounts it. The store's live resolution supersedes the
 * server-baked outcome literal (C-LR-1); the navigation structure stays
 * server-computed.
 */
function ReferenceValueDisplay({
	tokenKey,
	relativePath,
	resolved,
	rawRef,
}: {
	readonly tokenKey: string;
	readonly relativePath: string;
	readonly resolved: ResolvedReference | undefined;
	readonly rawRef: string;
}) {
	const liveValue = useResolvedPreview(tokenKey);
	if (resolved === undefined) {
		return <span className={styles.value}>{rawRef}</span>;
	}
	// The live resolution governs only a same-file reference; a cross-file
	// reference stays on the server `referenceView` (the store's
	// `#serverPreview` may not even be wired), so `useResolvedPreview` would
	// just report `unresolved` for it.
	const sameFile = resolved.outcomes.some(
		(outcome) => outcome.targetFile === relativePath,
	);
	return (
		<TokenReferenceValue
			resolved={resolved}
			liveValue={sameFile ? liveValue : undefined}
		/>
	);
}

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
	// The fallback JSON editor's buffer is raw *text* (parsed only on blur),
	// so it can't live in `draft` (which holds a parsed `value`). `undefined`
	// means "not being edited — show the serialized committed value".
	const [fallbackDraft, setFallbackDraft] = useState<string | undefined>(
		undefined,
	);
	const descriptionRef = useRef<HTMLTextAreaElement>(null);

	function commitDraft() {
		if (Object.keys(draft).length === 0) {
			return;
		}
		// Clear the buffer only when the store accepted the edit (INV-10). On a
		// rejected commit the draft stays so the user keeps the value they were
		// fixing; the reason shows via `getError(key)` (INV-12).
		if (commit(draft)) {
			setDraft({});
		}
	}

	function commitFallbackDraft() {
		if (fallbackDraft === undefined) {
			return;
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(fallbackDraft);
		} catch (parseError) {
			// Keep the unparseable text on screen so the user can fix it.
			store?.reportError(node.path.join("."), {
				name: error?.name,
				value: `Invalid JSON: ${parseError instanceof Error ? parseError.message : "could not parse"}`,
			});
			return;
		}
		commit({ value: parsed });
		setFallbackDraft(undefined);
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

	// The `parseReference -> contract -> editor-resolution` dispatch, memoised
	// on the shown value + the two type inputs (INV-13). A render that changes
	// none of those — a name / description keystroke, an unrelated store emit
	// — reuses the previous result rather than re-walking the chain.
	//
	// Path 1 (a reference value): a reference is valid for every `$type` (an
	// aliasing token's type is its target's), so `validateTokenValue` is never
	// called for it. `node.references[0]` is this whole-value reference's own
	// server-computed resolution (the live `useResolvedPreview` swap is later).
	const dispatch = useMemo(() => {
		const reference = parseReference(shown.value);
		const isUsableType =
			effectiveType !== undefined && isDtcgTokenType(effectiveType);
		const contract = isUsableType
			? resolveBuiltInContract(effectiveType)
			: undefined;
		const validation = contract
			? validateTokenValue(contract, shown.value)
			: undefined;
		const isValid =
			isUsableType && (contract === undefined || validation?.isOk());
		const { editor, editorOptions } =
			(isUsableType
				? resolveEditorForType(dtcgEditorConfig.extensions, effectiveType)
				: undefined) ?? {};
		return {
			reference,
			isUsableType,
			contract,
			validation,
			isValid,
			resolvedEditor: editor,
			resolvedEditorOptions: editorOptions,
			// Carried through as part of the INV-13 key so the `TypeSuggestion`
			// prompt is recomputed in lockstep with the dispatch.
			inferredType: node.inferredType,
		};
	}, [shown.value, effectiveType, node.inferredType]);

	if (dispatch.reference !== undefined) {
		const resolved = node.references?.[0];
		return (
			<TokenBlock
				name={currentName}
				onNameChange={handleNameChange}
				onNameBlur={commitDraft}
				error={error}
				nameAriaLabel={`${node.name} name`}
				headingId={headingId}
				rowTestId={rowTestId}
				type={effectiveType}
				isNonStandardType={false}
				headerExtra={referencedByBadge}
			>
				<span className={styles.field}>
					<span className={styles.fieldLabel}>Value</span>
					<ReferenceValueDisplay
						tokenKey={key}
						relativePath={relativePath}
						resolved={resolved}
						rawRef={dispatch.reference.raw}
					/>
				</span>
			</TokenBlock>
		);
	}

	if (!dispatch.isValid) {
		const { contract, validation, isUsableType } = dispatch;
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
						value: shown.value,
						error: errorForHandler,
					})
				: DefaultValidationErrorHandler({
						value: shown.value,
						error: errorForHandler,
					});

		return (
			<TokenBlock
				name={currentName}
				onNameChange={handleNameChange}
				onNameBlur={commitDraft}
				error={error}
				nameAriaLabel={`${node.name} name`}
				headingId={headingId}
				rowTestId={rowTestId}
				type={effectiveType}
				isNonStandardType={effectiveType !== undefined && !isUsableType}
				headerExtra={referencedByBadge}
			>
				<span className={styles.field}>
					<span className={styles.fieldLabel}>Value</span>
					<span className={styles.value}>{formatValue(shown.value)}</span>
				</span>
				{extraContent}
			</TokenBlock>
		);
	}

	const currentRawValue = shown.value;
	const currentDescription = shown.description;

	// A registered editor's `onChange` is keystroke-driven (e.g.
	// `DimensionEditor`'s number input), so it only updates `draft` (INV-9);
	// `commit` runs from `handleValueEditorBlur` when focus leaves the editor.
	function handleValueChange(next: unknown) {
		setDraft((current) => ({ ...current, value: next }));
	}

	// The registered editor is contract-typed and pluggable — a user
	// extension can't be given an `onBlur` prop — so blur is caught on a
	// wrapper via bubbling `focusout`. Focus moving *within* the editor (e.g.
	// `DimensionEditor`'s Value -> Unit) is not a commit.
	function handleValueEditorBlur(event: FocusEvent<HTMLSpanElement>) {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			commitDraft();
		}
	}

	function handleFallbackValueChange(nextText: string) {
		setFallbackDraft(nextText);
	}

	// The description field is *uncontrolled* (INV-9 intent / C-RI-2): a
	// keystroke in a free-text field you type sentences into must do no React
	// work at all, so it carries no `value` / `onChange` and buffers its text
	// in the DOM. On blur its current value is read once and staged — an
	// unchanged value stages nothing (rides U6).
	function commitDescription() {
		const next = descriptionRef.current?.value ?? "";
		if (next === (fields.description ?? "")) {
			return;
		}
		commit({ description: next });
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

	const ResolvedEditor = dispatch.resolvedEditor as
		| ((props: TokenTypeEditorProps<unknown>) => ReactElement)
		| undefined;

	const descriptionLabelId = `token-${key}-description-label`;

	return (
		<TokenBlock
			name={currentName}
			onNameChange={handleNameChange}
			onNameBlur={commitDraft}
			error={error}
			nameAriaLabel={`${node.name} name`}
			headingId={headingId}
			rowTestId={rowTestId}
			type={effectiveType}
			isNonStandardType={false}
			headerExtra={referencedByBadge}
		>
			{dispatch.inferredType !== undefined && fields.type === undefined && (
				<TypeSuggestion
					inferredType={dispatch.inferredType}
					onAccept={handleAcceptInferredType}
				/>
			)}
			{ResolvedEditor !== undefined ? (
				// biome-ignore lint/a11y/noStaticElementInteractions: a bubble-phase focusout catcher for the pluggable editor, not an interactive control itself
				<span onBlur={handleValueEditorBlur}>
					<ResolvedEditor
						value={currentRawValue}
						onChange={handleValueChange}
						options={dispatch.resolvedEditorOptions}
					/>
				</span>
			) : (
				<FallbackValueEditor
					value={fallbackDraft ?? JSON.stringify(currentRawValue, null, 2)}
					onChange={handleFallbackValueChange}
					onBlur={commitFallbackDraft}
				/>
			)}
			<label className={styles.descriptionField}>
				<span id={descriptionLabelId} className={styles.fieldLabel}>
					Description
				</span>
				<textarea
					// Uncontrolled: `defaultValue` only takes at mount, so re-key on
					// the committed value to re-sync the field when a `save` /
					// `discard` (or any external commit) changes it underneath the
					// user (U41f). An in-flight, still-uncommitted edit does not
					// change this value, so it is preserved across unrelated
					// re-renders (rides U49).
					key={`desc:${currentDescription ?? ""}`}
					ref={descriptionRef}
					aria-labelledby={`${headingId} ${descriptionLabelId}`}
					className={styles.descriptionTextarea}
					rows={1}
					defaultValue={currentDescription ?? ""}
					onBlur={commitDescription}
				/>
			</label>
		</TokenBlock>
	);
}
