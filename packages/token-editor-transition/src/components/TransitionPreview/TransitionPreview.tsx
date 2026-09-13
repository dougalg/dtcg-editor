import { TransitionValueSchema } from "@dtcg-editor/token-core";
import styles from "./TransitionPreview.module.css";

/**
 * `transitionTokenType`'s `Preview`: a short, single-line rendering of a
 * resolved reference's literal transition value, combining the duration and
 * timing function (delay is included only when non-zero, per spec User Story
 * 2 / SC-004 — a composite preview must still read as one short line).
 * `value` isn't guaranteed to actually be a `TransitionValue` (it comes from
 * resolving an arbitrary other token, not from this contract's own
 * `valueSchema`), so this re-validates it itself and declines (`null`) on a
 * mismatch, letting the host fall back to its own generic text rendering.
 *
 * The duration/timing-function text is deliberately composed to match
 * `DurationPreview`'s (`{value}{unit}`) and `CubicBezierPreview`'s
 * (`cubic-bezier(p1x, p1y, p2x, p2y)`) exact formatting, so a transition
 * token's preview reads identically to what a user already sees for the
 * corresponding standalone `duration`/`cubicBezier` tokens — see
 * `plan.md`'s Design Decisions for why this composes text rather than
 * nesting those components' own JSX.
 */
export function TransitionPreview({ value }: { readonly value: unknown }) {
	const parsed = TransitionValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const { duration, delay, timingFunction } = parsed.data;
	const [p1x, p1y, p2x, p2y] = timingFunction;
	let text = `${duration.value}${duration.unit} cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`;
	if (delay.value !== 0) {
		text += `, delay ${delay.value}${delay.unit}`;
	}
	return <span className={styles.text}>{text}</span>;
}
