import type { ReactNode } from "react";
import { resolveBuiltInContract } from "../token-editors/built-in.ts";
import styles from "./format-literal-value.module.css";

export function formatRaw(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Presents a resolved literal value the same way an equivalent literal
 * value of that type is presented elsewhere in the app (spec FR-009/FR-010),
 * delegating to that type's own built-in contract (e.g. color's swatch) —
 * this helper holds no knowledge of any specific DTCG `$type` itself.
 * Falls back to the value's raw text form for a type with no built-in
 * contract, no `Preview`, or whose `Preview` declines to render (e.g. the
 * value doesn't actually parse as that type).
 */
export function formatLiteralValue(
	value: unknown,
	type: string | undefined,
): ReactNode {
	const preview =
		type !== undefined
			? resolveBuiltInContract(type)?.Preview?.({ value })
			: undefined;
	return preview ?? <span className={styles.text}>{formatRaw(value)}</span>;
}
