/**
 * Icon paths below are vendored from Lucide (https://lucide.dev), ISC
 * License, Copyright (c) 2026 Lucide Icons and Contributors — vendored
 * rather than depending on the `lucide-react` package (per constitution
 * Principle VIII: no new dependency for a small, fixed icon set; see
 * docs/research/icon-library-options.md). Vendored verbatim except where a
 * comment below marks an intentional modification (`color` gets colored
 * dots, `gradient` gets a gradient stroke).
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 */
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

// lucide "palette" — dots recolored (INLINE NOTE: swap these fixed hex
// values for design-system color tokens once available).
function ColorIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
			<circle cx="13.5" cy="6.5" r=".5" fill="#ef4444" stroke="none" />
			<circle cx="17.5" cy="10.5" r=".5" fill="#eab308" stroke="none" />
			<circle cx="6.5" cy="12.5" r=".5" fill="#3b82f6" stroke="none" />
			<circle cx="8.5" cy="7.5" r=".5" fill="#22c55e" stroke="none" />
		</Svg>
	);
}

// lucide "ruler"
function DimensionIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
			<path d="m14.5 12.5 2-2" />
			<path d="m11.5 9.5 2-2" />
			<path d="m8.5 6.5 2-2" />
			<path d="m17.5 15.5 2-2" />
		</Svg>
	);
}

// lucide "type"
function FontFamilyIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 4v16" />
			<path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
			<path d="M9 20h6" />
		</Svg>
	);
}

// lucide "bold"
function FontWeightIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
		</Svg>
	);
}

// lucide "rotate-cw-fading-clock"
function DurationIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 3a9.75 9.75 0 0 1 6.74 2.74" />
			<path d="M18.74 5.74 21 8" />
			<path d="M21 8V3" />
			<path d="M7.5 19.794c-6-3.464-6-12.124 0-15.588" />
			<path d="M7.5 4.206A9 9 0 0 1 12 3" />
			<path d="M12 7v5l4 2" />
			<path d="M14 20.775A9 9 0 0 1 12 21" />
			<path d="M19 17.656a9 9 0 0 1-1.5 1.456" />
			<path d="M21 12a9 9 0 0 1-.228 2" />
			<path d="M21 8h-5" />
		</Svg>
	);
}

// lucide "tangent"
function CubicBezierIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="17" cy="4" r="2" />
			<path d="M15.59 5.41 5.41 15.59" />
			<circle cx="4" cy="17" r="2" />
			<path d="M12 22s-4-9-1.5-11.5S22 12 22 12" />
		</Svg>
	);
}

// lucide "hash"
function NumberIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<line x1="4" x2="20" y1="9" y2="9" />
			<line x1="4" x2="20" y1="15" y2="15" />
			<line x1="10" x2="8" y1="3" y2="21" />
			<line x1="16" x2="14" y1="3" y2="21" />
		</Svg>
	);
}

// lucide "line-style"
function StrokeStyleIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M11 5h2" />
			<path d="M15 12h6" />
			<path d="M19 5h2" />
			<path d="M3 12h6" />
			<path d="M3 19h18" />
			<path d="M3 5h2" />
		</Svg>
	);
}

// lucide "square-dashed-top-solid"
function BorderIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M14 21h1" />
			<path d="M21 14v1" />
			<path d="M21 19a2 2 0 0 1-2 2" />
			<path d="M21 9v1" />
			<path d="M3 14v1" />
			<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
			<path d="M3 9v1" />
			<path d="M5 21a2 2 0 0 1-2-2" />
			<path d="M9 21h1" />
		</Svg>
	);
}

// lucide "move-right"
function TransitionIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M18 8L22 12L18 16" />
			<path d="M2 12H22" />
		</Svg>
	);
}

// lucide "parasol"
function ShadowIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12.5 11.134 18.196 21" />
			<path d="M20.425 5.299a10 10 0 0 0-16.941 9.78c.183.563.843.774 1.355.478L20.16 6.711c.512-.296.66-.973.264-1.413" />
			<path d="M21 21H3" />
		</Svg>
	);
}

// lucide "audio-lines" — strokes recolored to a gradient (INLINE NOTE: swap
// these fixed hex stops for design-system color tokens once available).
function GradientIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<defs>
				<linearGradient
					id="dtcg-ed-gradient-icon-stroke"
					gradientUnits="userSpaceOnUse"
					x1="0"
					y1="0"
					x2="24"
					y2="0"
				>
					<stop offset="0" stopColor="#3b82f6" />
					<stop offset="0.5" stopColor="#a855f7" />
					<stop offset="1" stopColor="#ec4899" />
				</linearGradient>
			</defs>
			<path d="M2 10v3" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
			<path d="M6 6v11" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
			<path d="M10 3v18" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
			<path d="M14 8v7" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
			<path d="M18 5v13" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
			<path d="M22 10v3" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
		</Svg>
	);
}

// lucide "book-type"
function TypographyIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M10 13h4" />
			<path d="M12 6v7" />
			<path d="M16 8V6H8v2" />
			<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
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
