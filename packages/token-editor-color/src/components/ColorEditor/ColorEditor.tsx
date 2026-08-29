"use client";

import {
	COLOR_SPACES,
	type ColorObjectValue,
	type ColorSpace,
	type ColorValue,
} from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { type ReactElement, useId, useState } from "react";
import type { ColorEditorOptions } from "../../configuration.ts";
import type { ColorConversion } from "../../utils/conversion.ts";
import { checkColorValueIssues } from "../../utils/range-validation.ts";
import { ChannelInput } from "../ChannelInput/ChannelInput.tsx";
import { ColorFunctionValue } from "../ColorFunctionValue/ColorFunctionValue.tsx";
import { ColorSpaceSelect } from "../ColorSpaceSelect/ColorSpaceSelect.tsx";
import { SpaceConversionDialog } from "../SpaceConversionDialog/SpaceConversionDialog.tsx";
import styles from "./ColorEditor.module.css";

const DEFAULT_TOLERANCE = 0.02;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * `conversion.ts` pulls in `colorjs.io` — a chunky dependency the editor
 * only needs when the author *switches colour space* or edits a value that
 * carries an sRGB `hex` fallback. Load it on demand so it never lands in
 * the initial (client-rendered) editor bundle / hydration path.
 */
type ConversionModule = typeof import("../../utils/conversion.ts");
let conversionModulePromise: Promise<ConversionModule> | null = null;
function loadConversion(): Promise<ConversionModule> {
	conversionModulePromise ??= import("../../utils/conversion.ts");
	return conversionModulePromise;
}

/** `COLOR_SPACES`, deduped with `active` unioned in, in canonical order. */
function offeredColorSpaces(
	configured: readonly ColorSpace[] | undefined,
	active: ColorSpace,
): readonly ColorSpace[] {
	const allowed = new Set(configured ?? COLOR_SPACES);
	allowed.add(active);
	return COLOR_SPACES.filter((space) => allowed.has(space));
}

/** Which channel index each range issue refers to (from its `component N` text). */
function invalidChannels(
	issues: readonly string[],
): [boolean, boolean, boolean] {
	const flags: [boolean, boolean, boolean] = [false, false, false];
	for (const issue of issues) {
		const match = issue.match(/component (\d)/);
		const index = match ? Number(match[1]) : Number.NaN;
		if (index === 0 || index === 1 || index === 2) {
			flags[index] = true;
		}
	}
	return flags;
}

export function ColorEditor({
	value,
	onChange,
	options,
}: TokenTypeEditorProps<ColorValue>): ReactElement {
	const colorSpaces = (options as ColorEditorOptions | undefined)?.colorSpaces;
	const tolerance =
		(options as ColorEditorOptions | undefined)?.spaceSwitchTolerance ??
		DEFAULT_TOLERANCE;
	const alertId = useId();
	const [pending, setPending] = useState<{
		space: ColorSpace;
		conversion: ColorConversion;
	} | null>(null);

	const isLegacy = typeof value === "string";
	const activeSpace: ColorSpace = isLegacy ? "srgb" : value.colorSpace;
	const offered = offeredColorSpaces(colorSpaces, activeSpace);

	function applyConversion(conversion: ColorConversion): void {
		const next: ColorObjectValue = {
			colorSpace: conversion.targetSpace,
			components: conversion.components,
			...(conversion.alpha !== undefined ? { alpha: conversion.alpha } : {}),
			...(conversion.hex !== undefined ? { hex: conversion.hex } : {}),
		};
		onChange(next);
	}

	async function handleSpaceChange(nextSpace: ColorSpace): Promise<void> {
		if (nextSpace === activeSpace && !isLegacy) {
			return;
		}
		const { convertColorValue } = await loadConversion();
		const result = convertColorValue(value, nextSpace, tolerance);
		if (result.isErr()) {
			return; // UnknownError already logged; leave the value untouched
		}
		const conversion = result.value;
		if (conversion.classification === "within-tolerance") {
			applyConversion(conversion);
		} else {
			setPending({ space: nextSpace, conversion });
		}
	}

	/** Rebuild an edited object value, refreshing its `hex` fallback (async,
	 * lazy `colorjs.io`) only when one is present. */
	function commitObjectEdit(base: ColorObjectValue): void {
		if (base.hex === undefined) {
			onChange(base);
			return;
		}
		void loadConversion().then(({ colorValueToSrgbHex }) => {
			onChange({ ...base, hex: colorValueToSrgbHex(base) });
		});
	}

	const issues = isLegacy ? [] : checkColorValueIssues(value);
	const dialog = pending ? (
		<SpaceConversionDialog
			open
			sourceSpace={activeSpace}
			conversion={pending.conversion}
			onAccept={() => {
				applyConversion(pending.conversion);
				setPending(null);
			}}
			onDeny={() => setPending(null)}
		/>
	) : null;

	if (isLegacy) {
		return (
			<span className={styles.editor}>
				<ColorSpaceSelect
					value="hex"
					offered={offered}
					onChange={(next) => {
						void handleSpaceChange(next);
					}}
				>
					<ChannelInput
						mode="text"
						label="Legacy hex value"
						value={value}
						onCommit={(next) => {
							if (HEX_RE.test(next)) onChange(next);
						}}
					/>
				</ColorSpaceSelect>
				{dialog}
			</span>
		);
	}

	const invalid = invalidChannels(issues);

	return (
		<span className={styles.editor}>
			<ColorSpaceSelect
				value={pending?.space ?? (isLegacy ? "hex" : value.colorSpace)}
				offered={offered}
				onChange={(next) => {
					void handleSpaceChange(next);
				}}
			>
				<ColorFunctionValue
					value={value}
					issueDescribedById={issues.length > 0 ? alertId : undefined}
					invalid={invalid}
					onComponentChange={(index, next) => {
						const components = [
							...value.components,
						] as ColorObjectValue["components"];
						components[index] = next;
						commitObjectEdit({ ...value, components });
					}}
					onAlphaChange={(next) => {
						if (next === undefined) {
							commitObjectEdit({
								colorSpace: value.colorSpace,
								components: value.components,
								...(value.hex !== undefined ? { hex: value.hex } : {}),
							});
						} else {
							commitObjectEdit({ ...value, alpha: next });
						}
					}}
				/>
			</ColorSpaceSelect>
			{issues.length > 0 ? (
				<div id={alertId} role="alert" className={styles.issues}>
					<ul>
						{issues.map((issue) => (
							<li key={issue}>{issue}</li>
						))}
					</ul>
				</div>
			) : null}
			{dialog}
		</span>
	);
}
