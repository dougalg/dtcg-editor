/**
 * axe-core's WCAG tags are additive per spec version — checking only
 * "wcag22aa" would miss every earlier-version success criterion still
 * required for AA conformance. All four must be requested together to get
 * full "WCAG 2.2 AA and below" coverage.
 */
export const WCAG_22_AA_TAGS = [
	"wcag2a",
	"wcag2aa",
	"wcag21aa",
	"wcag22aa",
] as const;
