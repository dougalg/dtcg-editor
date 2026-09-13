"use client";

import type { ShadowValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { ShadowLayerFields } from "../ShadowLayerFields/ShadowLayerFields.tsx";
import styles from "./ShadowEditor.module.css";

/**
 * The editable UI for a Shadow token's `$value`: when `value` is a bare
 * single-layer object (not an array), renders exactly one
 * `ShadowLayerFields` block with no repeater chrome — matching
 * `BorderEditor`'s flat single-object precedent. The multi-layer
 * (array-of-layers) repeater case is added by a later phase of this
 * feature's implementation (plan.md's Design Decisions); this phase only
 * needs the bare-object branch to work correctly and independently.
 */
export function ShadowEditor({
	value,
	onChange,
}: TokenTypeEditorProps<ShadowValue>) {
	if (!Array.isArray(value)) {
		return (
			<span className={styles.container}>
				<ShadowLayerFields value={value} onChange={onChange} />
			</span>
		);
	}

	// Array branch: implemented in a later phase (the multi-layer repeater).
	// Rendered here only so a value that happens to arrive as an array does
	// not crash before that phase lands.
	return (
		<span className={styles.container}>
			{value.map((layer, index) => (
				<ShadowLayerFields
					key={index}
					value={layer}
					onChange={(next) => {
						const nextLayers = [...value];
						nextLayers[index] = next;
						onChange(nextLayers);
					}}
				/>
			))}
		</span>
	);
}
