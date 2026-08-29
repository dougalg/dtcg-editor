/**
 * Renders a channel/alpha value exactly as stored — no rounding, no
 * precision cap — with trailing fractional zeros and a bare trailing `.`
 * trimmed, `-0` normalised to `0`, and never in exponent notation
 * (FR-002d / research R3).
 *
 * Kept in its own dependency-free module: `ChannelInput`,
 * `ColorFunctionValue`, and `SpaceConversionDialog` all need it at render
 * time, and it must not drag `colorjs.io` (imported by `conversion.ts`)
 * into their client bundles.
 */
export function formatChannel(n: number): string {
	if (Object.is(n, -0) || n === 0) {
		return "0";
	}
	if (!Number.isFinite(n)) {
		return String(n);
	}
	let s = n.toString();
	if (/e/i.test(s)) {
		s = expandExponent(n);
	}
	if (s.includes(".")) {
		s = s.replace(/0+$/, "").replace(/\.$/, "");
	}
	return s === "-0" ? "0" : s;
}

function expandExponent(n: number): string {
	const [mantissa, expPart] = n.toString().split(/e/i);
	const exp = Number(expPart);
	if (exp >= 0) {
		return n.toFixed(0);
	}
	const fractionDigits = (mantissa?.split(".")[1]?.length ?? 0) - exp;
	return n.toFixed(Math.min(Math.max(fractionDigits, 0), 100));
}
