import type { TypographyValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TypographyEditor } from "./TypographyEditor.tsx";

function ControlledTypographyEditor(props: {
	readonly initialValue: TypographyValue;
}) {
	const [value, setValue] = useState(props.initialValue);
	return <TypographyEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/TypographyEditor",
	component: ControlledTypographyEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledTypographyEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		initialValue: {
			fontFamily: "Arial",
			fontSize: { value: 16, unit: "px" },
			fontWeight: 700,
			letterSpacing: { value: 0, unit: "px" },
			lineHeight: 1.4,
		},
	},
};

export const WithLetterSpacingAndStack: Story = {
	args: {
		initialValue: {
			fontFamily: ["Helvetica", "Arial", "sans-serif"],
			fontSize: { value: 1, unit: "rem" },
			fontWeight: "bold",
			letterSpacing: { value: 1, unit: "px" },
			lineHeight: 1.2,
		},
	},
};
