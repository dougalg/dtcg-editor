import { ColorValueSchema } from "@dtcg-editor/token-core";
import type { CSSProperties } from "react";
import { colorValueToCssColor } from "../../utils/css-color.ts";
import styles from "./Swatch.module.css";

function swatchStyle(color: string): CSSProperties {
	return { "--swatch-color": color } as CSSProperties;
}

type SwatchProperties = {
	value: unknown;
};

export const Swatch = ({ value }: SwatchProperties) => {
	const parsed = ColorValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const cssColor = colorValueToCssColor(parsed.data);
	return <span className={styles.swatch} style={swatchStyle(cssColor)} />;
};
