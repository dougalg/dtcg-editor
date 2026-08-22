"use client";

import {
	COLOR_SPACES,
	type ColorObjectValue,
	type ColorSpace,
	type ColorValue,
} from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { type ChangeEvent, type CSSProperties, useState } from "react";
import type { ColorEditorOptions } from "../../configuration.ts";
import {
	colorValueToSrgbHex,
	srgbHexToColorSpaceComponents,
} from "../../utils/conversion.ts";
import { colorValueToCssColor } from "../../utils/css-color.ts";
import {
	COMPONENT_RANGES,
	checkColorValueIssues,
} from "../../utils/range-validation.ts";
import styles from "./ColorEditor.module.css";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** The swatch's fill is inherently dynamic (whatever color the token/input
 * currently resolves to), so it can't be a static CSS/design-token value —
 * threaded through as a custom property instead of a `backgroundColor`
 * inline style, so `.swatch`'s other properties (size, border, radius —
 * all design tokens) stay in CSS. */
function swatchStyle(color: string): CSSProperties {
	return { "--swatch-color": color } as CSSProperties;
}

/** `COLOR_SPACES`, deduped with `active` unioned in, kept in canonical order regardless of allow-list order (FR-05/AC-05/AC-06). */
function offeredColorSpaces(
	configured: readonly ColorSpace[] | undefined,
	active: ColorSpace,
): readonly ColorSpace[] {
	const allowed = new Set(configured ?? COLOR_SPACES);
	allowed.add(active);
	return COLOR_SPACES.filter((space) => allowed.has(space));
}

function withComponent(
	value: ColorObjectValue,
	index: 0 | 1 | 2,
	component: number | "none",
): ColorObjectValue {
	const components = [...value.components] as [
		number | "none",
		number | "none",
		number | "none",
	];
	components[index] = component;
	return { ...value, components };
}

function withoutAlpha(value: ColorObjectValue): ColorObjectValue {
	return {
		colorSpace: value.colorSpace,
		components: value.components,
		...(value.hex !== undefined ? { hex: value.hex } : {}),
	};
}

function withoutHex(value: ColorObjectValue): ColorObjectValue {
	return {
		colorSpace: value.colorSpace,
		components: value.components,
		...(value.alpha !== undefined ? { alpha: value.alpha } : {}),
	};
}

function ObjectColorEditor({
	value,
	onChange,
	colorSpaces,
}: {
	value: ColorObjectValue;
	onChange: (next: ColorValue) => void;
	colorSpaces?: readonly ColorSpace[] | undefined;
}) {
	const [hexInput, setHexInput] = useState(value.hex ?? "");
	const componentLabels = COMPONENT_RANGES[value.colorSpace].map(
		(range) => range.label,
	);
	const cssColor = colorValueToCssColor(value);
	const offeredSpaces = offeredColorSpaces(colorSpaces, value.colorSpace);
	const rangeIssues = checkColorValueIssues(value);

	function handleColorSpaceChange(event: ChangeEvent<HTMLSelectElement>) {
		onChange({
			...value,
			colorSpace: event.target.value as ColorObjectValue["colorSpace"],
		});
	}

	function handlePickerChange(event: ChangeEvent<HTMLInputElement>) {
		const components = srgbHexToColorSpaceComponents(
			event.target.value,
			value.colorSpace,
		);
		if (components === null) {
			return;
		}
		onChange({ ...value, components });
	}

	function handleComponentValueChange(
		index: 0 | 1 | 2,
		event: ChangeEvent<HTMLInputElement>,
	) {
		const next = Number(event.target.value);
		if (Number.isNaN(next)) {
			return;
		}
		onChange(withComponent(value, index, next));
	}

	function handleComponentNoneToggle(
		index: 0 | 1 | 2,
		event: ChangeEvent<HTMLInputElement>,
	) {
		onChange(withComponent(value, index, event.target.checked ? "none" : 0));
	}

	function handleAlphaToggle(event: ChangeEvent<HTMLInputElement>) {
		onChange(
			event.target.checked ? { ...value, alpha: 1 } : withoutAlpha(value),
		);
	}

	function handleAlphaChange(event: ChangeEvent<HTMLInputElement>) {
		const next = Number(event.target.value);
		if (Number.isNaN(next)) {
			return;
		}
		onChange({ ...value, alpha: next });
	}

	function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
		const next = event.target.value;
		setHexInput(next);
		if (next === "") {
			onChange(withoutHex(value));
			return;
		}
		if (HEX_PATTERN.test(next)) {
			onChange({ ...value, hex: next });
		}
	}

	return (
		<span>
			<label>
				<span className={styles.labelText}>Pick a color</span>
				<input
					type="color"
					className={styles.picker}
					value={colorValueToSrgbHex(value)}
					onChange={handlePickerChange}
				/>
			</label>
			<span
				className={styles.swatch}
				style={swatchStyle(cssColor)}
				aria-hidden="true"
			/>
			<label>
				<span className={styles.labelText}>Color space</span>
				<select value={value.colorSpace} onChange={handleColorSpaceChange}>
					{offeredSpaces.map((space) => (
						<option key={space} value={space}>
							{space}
						</option>
					))}
				</select>
			</label>
			{([0, 1, 2] as const).map((index) => {
				const component = value.components[index];
				const isNone = component === "none";
				return (
					<span key={index} className={styles.componentRow}>
						<label>
							<span className={styles.labelText}>
								{value.colorSpace} component {componentLabels[index]}
							</span>
							<input
								type="number"
								value={isNone ? "" : component}
								disabled={isNone}
								onChange={(event) => handleComponentValueChange(index, event)}
							/>
						</label>
						<label>
							<span className={styles.labelText}>
								{componentLabels[index]} is none
							</span>
							<input
								type="checkbox"
								checked={isNone}
								onChange={(event) => handleComponentNoneToggle(index, event)}
							/>
						</label>
					</span>
				);
			})}
			<label>
				<span className={styles.labelText}>Has alpha</span>
				<input
					type="checkbox"
					checked={value.alpha !== undefined}
					onChange={handleAlphaToggle}
				/>
			</label>
			{value.alpha !== undefined ? (
				<label>
					<span className={styles.labelText}>Alpha</span>
					<input
						type="number"
						step="0.01"
						value={value.alpha}
						onChange={handleAlphaChange}
					/>
				</label>
			) : null}
			<label>
				<span className={styles.labelText}>Hex (optional)</span>
				<input
					type="text"
					value={hexInput}
					onChange={handleHexChange}
					placeholder="#rrggbb"
				/>
			</label>
			{rangeIssues.length > 0 && (
				<div role="alert">
					<ul className={styles.colorIssues}>
						{rangeIssues.map((issue) => (
							<li key={issue}>{issue}</li>
						))}
					</ul>
				</div>
			)}
		</span>
	);
}

function LegacyHexColorEditor({
	value,
	onChange,
}: {
	value: string;
	onChange: (next: ColorValue) => void;
}) {
	const [hexInput, setHexInput] = useState(value);

	function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
		const next = event.target.value;
		setHexInput(next);
		if (HEX_PATTERN.test(next)) {
			onChange(next);
		}
	}

	function handlePickerChange(event: ChangeEvent<HTMLInputElement>) {
		const next = event.target.value;
		setHexInput(next);
		onChange(next);
	}

	return (
		<span>
			<label>
				<span className={styles.labelText}>Pick a color</span>
				<input
					type="color"
					className={styles.picker}
					value={colorValueToSrgbHex(value)}
					onChange={handlePickerChange}
				/>
			</label>
			<span
				className={styles.swatch}
				style={swatchStyle(colorValueToCssColor(value))}
				aria-hidden="true"
			/>
			<label>
				<span className={styles.labelText}>Legacy hex value</span>
				<input
					type="text"
					value={hexInput}
					onChange={handleHexChange}
					placeholder="#rrggbb"
				/>
			</label>
		</span>
	);
}

/**
 * The editable UI for a Color token's `$value`, registered via `colorTokenType`.
 * `options` is this type's resolved `editorOptions` (validated at config-load
 * time against `ColorEditorOptionsSchema`, see `token-type.ts`) — cast via
 * unknown-erasure, the same pattern `built-in.ts` already uses to erase
 * `TokenTypeContract<unknown>`. `options === undefined` (no extension entry,
 * or one with no `editorOptions`) means all 14 spaces stay offered, matching
 * FR-04's zero-config behavior.
 */
export function ColorEditor({
	value,
	onChange,
	options,
}: TokenTypeEditorProps<ColorValue>) {
	const colorSpaces = (options as ColorEditorOptions | undefined)?.colorSpaces;
	if (typeof value === "string") {
		return <LegacyHexColorEditor value={value} onChange={onChange} />;
	}
	return (
		<ObjectColorEditor
			value={value}
			onChange={onChange}
			colorSpaces={colorSpaces}
		/>
	);
}
