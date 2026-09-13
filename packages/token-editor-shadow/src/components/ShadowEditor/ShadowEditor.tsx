"use client";

import { Button } from "@dtcg-editor/design-system/components/Button/Button.tsx";
import type { ShadowLayer, ShadowValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { useEffect, useState } from "react";
import { ShadowLayerFields } from "../ShadowLayerFields/ShadowLayerFields.tsx";
import styles from "./ShadowEditor.module.css";

/** A fixed, schema-valid default layer for a newly-added row (spec.md Assumptions). */
function defaultLayer(): ShadowLayer {
	return {
		color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1 },
		offsetX: { value: 0, unit: "px" },
		offsetY: { value: 0, unit: "px" },
		blur: { value: 0, unit: "px" },
		spread: { value: 0, unit: "px" },
	};
}

function toLayers(value: ShadowValue): readonly ShadowLayer[] {
	return Array.isArray(value) ? value : [value];
}

/**
 * The editable UI for a Shadow token's `$value`.
 *
 * A bare single-layer object renders exactly one `ShadowLayerFields` block
 * with no repeater chrome, matching `BorderEditor`'s flat single-object
 * precedent. An array value — the first composite-of-composites this repo
 * has built — renders a repeater (one `ShadowLayerFields` row per layer,
 * plus add/remove/move-up/move-down controls) adapted from
 * `FontFamilyEditor`'s add/remove/reorder list pattern, applied to composite
 * `ShadowLayer` objects instead of plain strings (see plan.md's Design
 * Decisions).
 *
 * The on-disk bare-object-vs-array distinction is preserved rather than
 * re-derived from the current layer count: `wasArray` is captured from
 * whether the incoming `value` prop is an array, on mount and whenever the
 * prop changes, not recomputed from internal list length the way
 * `FontFamilyEditor.toList`/`fromList` treat bare-string vs. one-item-array
 * as interchangeable. This is deliberate — `shadow`'s spec requires a
 * one-item *array* to keep showing repeater chrome and to keep serializing
 * as an array, unlike `FontFamilyEditor`'s font-family type, where the two
 * forms are fully interchangeable by spec.
 */
export function ShadowEditor({
	value,
	onChange,
}: TokenTypeEditorProps<ShadowValue>) {
	const [wasArray, setWasArray] = useState(() => Array.isArray(value));
	const serializedValue = JSON.stringify(value);

	useEffect(() => {
		setWasArray(Array.isArray(value));
	}, [serializedValue]);

	if (!wasArray) {
		return (
			<span className={styles.container}>
				<ShadowLayerFields value={value as ShadowLayer} onChange={onChange} />
			</span>
		);
	}

	const layers = toLayers(value);

	function commit(next: readonly ShadowLayer[]) {
		onChange([...next]);
	}

	function handleLayerChange(index: number, layer: ShadowLayer) {
		const next = layers.map((entry, i) => (i === index ? layer : entry));
		commit(next);
	}

	function handleAdd() {
		commit([...layers, defaultLayer()]);
	}

	function handleRemove(index: number) {
		commit(layers.filter((_, i) => i !== index));
	}

	function handleMove(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= layers.length) {
			return;
		}
		const next = [...layers];
		const [item] = next.splice(index, 1);
		next.splice(target, 0, item as ShadowLayer);
		commit(next);
	}

	return (
		<ul className={styles.list}>
			{layers.map((entry, index) => (
				<li key={index} className={styles.row}>
					<ShadowLayerFields
						value={entry}
						onChange={(layer) => handleLayerChange(index, layer)}
					/>
					<Button
						type="button"
						onClick={() => handleMove(index, -1)}
						disabled={index === 0}
					>
						Move up
					</Button>
					<Button
						type="button"
						onClick={() => handleMove(index, 1)}
						disabled={index === layers.length - 1}
					>
						Move down
					</Button>
					<Button
						type="button"
						onClick={() => handleRemove(index)}
						disabled={layers.length === 1}
					>
						Remove
					</Button>
				</li>
			))}
			<li>
				<Button type="button" onClick={handleAdd}>
					Add layer
				</Button>
			</li>
		</ul>
	);
}
