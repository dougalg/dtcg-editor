import { TypographyValueSchema } from "@dtcg-editor/token-core";
import styles from "./TypographyPreview.module.css";

/** Preview shows at most this many `fontFamily` stack entries before summarizing the rest as "+N more". */
const MAX_VISIBLE_FAMILIES = 3;

function formatFamilies(names: readonly string[]): string {
	if (names.length <= MAX_VISIBLE_FAMILIES) {
		return names.join(", ");
	}
	const visible = names.slice(0, MAX_VISIBLE_FAMILIES);
	const remaining = names.length - MAX_VISIBLE_FAMILIES;
	return `${visible.join(", ")}, +${remaining} more`;
}

/**
 * `typographyTokenType`'s `Preview`: a short, single-line rendering of a
 * resolved reference's literal typography value, composing font size, line
 * height, font family, and font weight (e.g. `16px/1.4 Arial 700`), with
 * letter spacing appended only when non-zero, per spec User Story 2 / SC-004
 * — a composite preview must still read as one short line. With five fields
 * (more than `transition`'s three), nesting the sibling
 * `FontFamilyPreview`/`DimensionPreview`/`FontWeightPreview` components' own
 * wrapper elements would be more awkward to compact into one line than it
 * already was for `transition` — see `plan.md`'s Design Decisions — so this
 * composes plain text instead, matching each sibling's own per-field
 * formatting (`DimensionPreview`'s `{value}{unit}`, `FontFamilyPreview`'s
 * plain/joined-stack text, `FontWeightPreview`'s `String(value)`).
 *
 * `value` isn't guaranteed to actually be a `TypographyValue` (it comes from
 * resolving an arbitrary other token, not from this contract's own
 * `valueSchema`), so this re-validates it itself and declines (`null`) on a
 * mismatch, letting the host fall back to its own generic text rendering.
 */
export function TypographyPreview({ value }: { readonly value: unknown }) {
	const parsed = TypographyValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight } =
		parsed.data;
	const familyText =
		typeof fontFamily === "string" ? fontFamily : formatFamilies(fontFamily);
	let text = `${fontSize.value}${fontSize.unit}/${lineHeight} ${familyText} ${String(fontWeight)}`;
	if (letterSpacing.value !== 0) {
		text += ` +${letterSpacing.value}${letterSpacing.unit}`;
	}
	return <span className={styles.text}>{text}</span>;
}
