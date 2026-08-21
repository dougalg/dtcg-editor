import type { DtcgTokenType } from "@dtcg-editor/token-core";
import type { ReactElement, ReactNode } from "react";

type IconProps = { readonly className?: string | undefined };

function Svg({
	className,
	children,
}: IconProps & { readonly children: ReactNode }) {
	return (
		<svg
			className={className}
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			{children}
		</svg>
	);
}

function ColorIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" />
		</Svg>
	);
}

function DimensionIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
		</Svg>
	);
}

function FontFamilyIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M6 20 11 4h2l5 16M8 14h8" />
		</Svg>
	);
}

function FontWeightIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect
				x="3"
				y="16"
				width="18"
				height="3"
				fill="currentColor"
				stroke="none"
			/>
			<rect
				x="3"
				y="10.5"
				width="18"
				height="2"
				fill="currentColor"
				stroke="none"
			/>
			<rect
				x="3"
				y="6"
				width="18"
				height="1"
				fill="currentColor"
				stroke="none"
			/>
		</Svg>
	);
}

function DurationIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="8" />
			<path d="M12 8v4l3 2" />
		</Svg>
	);
}

function CubicBezierIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 18C8 18 8 6 12 6c4 0 4 12 8 12" />
			<circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
			<circle cx="20" cy="18" r="1.2" fill="currentColor" stroke="none" />
		</Svg>
	);
}

function NumberIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M8 4 6 20M18 4l-2 16M4 9h16M3 15h16" />
		</Svg>
	);
}

function StrokeStyleIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3 12h3M10 12h3M17 12h3" />
		</Svg>
	);
}

function BorderIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="4" y="4" width="16" height="16" rx="1" />
		</Svg>
	);
}

function TransitionIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 12h13M12 6l7 6-7 6" />
		</Svg>
	);
}

function ShadowIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect
				x="4"
				y="4"
				width="13"
				height="13"
				fill="currentColor"
				stroke="none"
				opacity="0.5"
			/>
			<rect
				x="8"
				y="8"
				width="13"
				height="13"
				fill="currentColor"
				stroke="none"
			/>
		</Svg>
	);
}

function GradientIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<defs>
				<linearGradient id="dtcg-ed-gradient-icon" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="currentColor" stopOpacity="0.15" />
					<stop offset="1" stopColor="currentColor" stopOpacity="1" />
				</linearGradient>
			</defs>
			<rect
				x="4"
				y="4"
				width="16"
				height="16"
				rx="1"
				fill="url(#dtcg-ed-gradient-icon)"
				stroke="none"
			/>
		</Svg>
	);
}

function TypographyIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 6h16M8 6v14M14 10h6M17 10v10" />
		</Svg>
	);
}

/** Generic fallback for a missing or non-standard token type. */
function FallbackIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 16v.01M12 8a2.5 2.5 0 0 1 2.5 2.5c0 1.5-2.5 1.75-2.5 3.5" />
		</Svg>
	);
}

const TOKEN_TYPE_ICONS: Record<
	DtcgTokenType,
	(props: IconProps) => ReactElement
> = {
	color: ColorIcon,
	dimension: DimensionIcon,
	fontFamily: FontFamilyIcon,
	fontWeight: FontWeightIcon,
	duration: DurationIcon,
	cubicBezier: CubicBezierIcon,
	number: NumberIcon,
	strokeStyle: StrokeStyleIcon,
	border: BorderIcon,
	transition: TransitionIcon,
	shadow: ShadowIcon,
	gradient: GradientIcon,
	typography: TypographyIcon,
};

/**
 * Resolves the icon for a token's type, falling back to a generic icon for a
 * missing or unrecognized (non-standard) type — every case is covered, so
 * this never returns nothing.
 */
export function resolveTokenTypeIcon(
	type: DtcgTokenType | string | undefined,
): (props: IconProps) => ReactElement {
	if (type !== undefined && type in TOKEN_TYPE_ICONS) {
		return TOKEN_TYPE_ICONS[type as DtcgTokenType];
	}
	return FallbackIcon;
}
