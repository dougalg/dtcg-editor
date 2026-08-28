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
import {
	type ColorConversion,
	colorValueToSrgbHex,
	convertColorValue,
} from "../../utils/conversion.ts";
import { checkColorValueIssues } from "../../utils/range-validation.ts";
import { ChannelInput } from "../ChannelInput/ChannelInput.tsx";
import { ColorFunctionValue } from "../ColorFunctionValue/ColorFunctionValue.tsx";
import { ColorSpaceSelect } from "../ColorSpaceSelect/ColorSpaceSelect.tsx";
import { SpaceConversionDialog } from "../SpaceConversionDialog/SpaceConversionDialog.tsx";
import styles from "./ColorEditor.module.css";

const DEFAULT_TOLERANCE = 0.02;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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

function withHexInSync(value: ColorObjectValue): ColorObjectValue {
	return value.hex === undefined
		? value
		: { ...value, hex: colorValueToSrgbHex(value) };
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

	function handleSpaceChange(nextSpace: ColorSpace): void {
		if (nextSpace === activeSpace && !isLegacy) {
			return;
		}
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

	const spaceSelect = (
		<ColorSpaceSelect
			value={pending?.space ?? (isLegacy ? "hex" : value.colorSpace)}
			offered={offered}
			onChange={handleSpaceChange}
		/>
	);

	if (isLegacy) {
		return (
			<span className={styles.editor}>
				{spaceSelect}
				<span className={styles.inert}> </span>
				<ChannelInput
					mode="text"
					label="Legacy hex value"
					value={value}
					onCommit={(next) => {
						if (HEX_RE.test(next)) onChange(next);
					}}
				/>
				{dialog}
			</span>
		);
	}

	const invalid = invalidChannels(issues);

	return (
		<span className={styles.editor}>
			<ColorFunctionValue
				value={value}
				spaceSelect={spaceSelect}
				issueDescribedById={issues.length > 0 ? alertId : undefined}
				invalid={invalid}
				onComponentChange={(index, next) => {
					const components = [
						...value.components,
					] as ColorObjectValue["components"];
					components[index] = next;
					onChange(withHexInSync({ ...value, components }));
				}}
				onAlphaChange={(next) => {
					if (next === undefined) {
						onChange(
							withHexInSync({
								colorSpace: value.colorSpace,
								components: value.components,
								...(value.hex !== undefined ? { hex: value.hex } : {}),
							}),
						);
					} else {
						onChange(withHexInSync({ ...value, alpha: next }));
					}
				}}
			/>
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
