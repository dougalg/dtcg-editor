"use client";

import { useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { dimensionTokenType } from "@dtcg-editor/token-type-dimension";
import type { DimensionValue } from "@dtcg-editor/token-type-dimension";
import { colorTokenType } from "@dtcg-editor/token-type-color";
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
	validateDimensionValue,
} from "../lib/tokens/edit-state.ts";
import { describeColorForDisplay } from "../lib/tokens/color-display.ts";
import type { ClientEdit } from "../lib/tokens/edit-state.ts";
import type { SaveError } from "../lib/tokens/save-error.ts";
import { useSaveTokenEdits } from "../hooks/useSaveTokenEdits.ts";
import { SaveButton } from "./SaveButton.tsx";
import { FallbackValueEditor } from "./FallbackValueEditor.tsx";
import dtcgEditorConfig from "../lib/token-editors/user-config.ts";
import { resolveEditorForType } from "../lib/token-editors/resolve-editor.ts";
import { resolveBuiltInContract } from "../lib/token-editors/built-in.ts";
import styles from "./TokenTree.module.css";

/**
 * The registry's `editor` values are typed generically (`TokenTypeEditorProps<unknown>`)
 * so heterogeneous editors can share one array — see `lib/token-editors/built-in.ts`.
 * At a dimension-token render call site the concrete value shape is always
 * `DimensionValue`, since this cast is only ever applied when `isDimension`
 * is true; safe for the same reason the registry's own cast is: nothing here
 * inspects `value`, it's only threaded through to whichever component
 * renders it.
 */
type DimensionEditorComponent = (
	props: TokenTypeEditorProps<DimensionValue>,
) => ReactElement;

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

function formatValue(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

interface FieldErrors {
	readonly name: string | undefined;
	readonly value: string | undefined;
}

type EditablePatch = Partial<
	Pick<ClientEdit, "name" | "value" | "description">
>;

interface TreeNodeProps {
	readonly node: PlainDtcgNode;
	readonly root: PlainDtcgNode;
	readonly pendingEdits: ReadonlyMap<string, ClientEdit>;
	readonly fieldErrors: ReadonlyMap<string, FieldErrors>;
	readonly onStageEdit: (path: readonly string[], patch: EditablePatch) => void;
	readonly onFieldError: (path: readonly string[], errors: FieldErrors) => void;
}

function TreeNode({
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
		const isDimension = effectiveType === dimensionTokenType.type;
		const dimensionValueValidation = isDimension
			? validateDimensionValue(node.value)
			: undefined;
		// Narrowed via its own `if`, not derived from `canEdit` below, so this
		// stays type-safe regardless of how `canEdit` combines it with the
		// other standard-type branches.
		let existingDimensionValue: DimensionValue | undefined;
		if (dimensionValueValidation?.ok === true) {
			existingDimensionValue = dimensionValueValidation.value;
		}
		// A standard, non-dimension type is only editable if its value actually
		// parses against that type's own contract schema (when a built-in
		// contract exists for it) — generalizes the dimension guard above.
		// A standard type with no built-in contract (e.g. a user-registered
		// extension for a type with no schema) has nothing to validate
		// against, so its value is trusted as-is, matching the existing
		// generic-editor design.
		const builtInContract =
			isStandard && !isDimension && effectiveType !== undefined
				? resolveBuiltInContract(effectiveType)
				: undefined;
		const genericValueValidation = builtInContract
			? validateTokenValue(builtInContract, node.value)
			: undefined;
		const canEdit = isDimension
			? existingDimensionValue !== undefined
			: (genericValueValidation?.isOk() ?? isStandard);
		const { editor: resolvedEditor, editorOptions: resolvedEditorOptions } =
			(isStandard && effectiveType !== undefined
				? resolveEditorForType(dtcgEditorConfig.extensions, effectiveType)
				: undefined) ?? {};

		if (!canEdit) {
			const isColor = node.effectiveType === colorTokenType.type;
			const colorDisplay = isColor
				? describeColorForDisplay(node.value)
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
					{colorDisplay?.cssColor !== undefined && (
						<span
							className={styles.swatch}
							style={{ backgroundColor: colorDisplay.cssColor }}
							aria-hidden="true"
						/>
					)}
					<span className={styles.field}>
						<span className={styles.fieldLabel}>{node.name} value</span>
						<span className={styles.value}>{formatValue(node.value)}</span>
					</span>
					{colorDisplay !== undefined && colorDisplay.issues.length > 0 && (
						<ul role="alert" className={styles.colorIssues}>
							{colorDisplay.issues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
					)}
				</li>
			);
		}

		const currentName = pending?.name ?? node.name;
		// Safe: the only place that stages `pending.value` for a dimension token
		// is `handleDimensionValueChange` below, which validates it against
		// `DimensionValueSchema` before ever calling `onStageEdit` — nothing
		// else writes to `pendingEdits`.
		const currentDimensionValue =
			(pending?.value as DimensionValue | undefined) ?? existingDimensionValue;
		const currentRawValue = pending?.value ?? node.value;
		const currentDescription = pending?.description ?? node.description ?? "";
		// `ColorValueSchema` only checks shape (used above to gate `canEdit`),
		// not per-colorSpace numeric ranges — so a structurally valid but
		// out-of-range color value passes validation and becomes editable.
		// Surface `checkColorValueIssues`' range violations here too, so an
		// out-of-range value isn't silently editable with no indication
		// anything's wrong.
		const editableColorIssues =
			effectiveType === colorTokenType.type
				? describeColorForDisplay(currentRawValue).issues
				: undefined;

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

		function handleDimensionValueChange(nextValue: DimensionValue) {
			const validation = validateDimensionValue(nextValue);
			if (!validation.ok) {
				onFieldError(node.path, {
					name: errors?.name,
					value: validation.error,
				});
				return;
			}
			onFieldError(node.path, { name: errors?.name, value: undefined });
			onStageEdit(node.path, { value: validation.value });
		}

		// A standard, non-dimension type with a registered editor — no core
		// contract schema exists for any type but dimension yet, so (like the
		// fallback path below) the value is trusted as-is.
		function handleGenericValueChange(next: unknown) {
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

		const DimensionEditor = resolvedEditor as
			DimensionEditorComponent | undefined;
		const GenericEditor = resolvedEditor as
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
				{isDimension &&
					DimensionEditor !== undefined &&
					currentDimensionValue !== undefined && (
						<DimensionEditor
							value={currentDimensionValue}
							onChange={handleDimensionValueChange}
							options={resolvedEditorOptions}
						/>
					)}
				{!isDimension && GenericEditor !== undefined && (
					<GenericEditor
						value={currentRawValue}
						onChange={handleGenericValueChange}
						options={resolvedEditorOptions}
					/>
				)}
				{!isDimension && GenericEditor === undefined && (
					<FallbackValueEditor
						value={JSON.stringify(currentRawValue, null, 2)}
						onChange={handleFallbackValueChange}
					/>
				)}
				{editableColorIssues !== undefined &&
					editableColorIssues.length > 0 && (
						<ul role="alert" className={styles.colorIssues}>
							{editableColorIssues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
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
			<ul className={styles.root}>
				<TreeNode
					node={treeState}
					root={treeState}
					pendingEdits={pendingEdits}
					fieldErrors={fieldErrors}
					onStageEdit={stageEdit}
					onFieldError={setFieldError}
				/>
			</ul>
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
