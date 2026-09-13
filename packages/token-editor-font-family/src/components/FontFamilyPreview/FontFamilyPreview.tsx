import { FontFamilyValueSchema } from "@dtcg-editor/token-core";
import styles from "./FontFamilyPreview.module.css";

/** Preview shows at most this many entries before summarizing the rest as "+N more". */
const MAX_VISIBLE_ENTRIES = 3;

function formatFamilies(names: readonly string[]): string {
	if (names.length <= MAX_VISIBLE_ENTRIES) {
		return names.join(", ");
	}
	const visible = names.slice(0, MAX_VISIBLE_ENTRIES);
	const remaining = names.length - MAX_VISIBLE_ENTRIES;
	return `${visible.join(", ")}, +${remaining} more`;
}

/**
 * `fontFamilyTokenType`'s `Preview`: shows a resolved reference's literal
 * font family value (a single name, or a comma-joined preference stack) as
 * plain text — mirrors `ColorPreview`/`FontWeightPreview`'s
 * validate-then-render pattern. `value` isn't guaranteed to actually be a
 * `FontFamilyValue` (it comes from resolving an arbitrary other token, not
 * from this contract's own `valueSchema`), so this re-validates it itself and
 * declines (`null`) on a mismatch, letting the host fall back to its own
 * generic text rendering.
 */
export function FontFamilyPreview({ value }: { readonly value: unknown }) {
	const parsed = FontFamilyValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const text =
		typeof parsed.data === "string" ? parsed.data : formatFamilies(parsed.data);
	return <span className={styles.text}>{text}</span>;
}
