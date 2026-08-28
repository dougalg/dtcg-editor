import type { ColorSpace, ColorValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ColorEditor } from "./ColorEditor.tsx";

function ControlledColorEditor(props: {
	readonly initialValue: ColorValue;
	readonly options?: { readonly colorSpaces?: readonly ColorSpace[] };
}) {
	const [value, setValue] = useState(props.initialValue);
	return (
		<ColorEditor value={value} onChange={setValue} options={props.options} />
	);
}

const meta = {
	title: "Editors/ColorEditor",
	component: ControlledColorEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledColorEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		initialValue: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
	},
};

export const RestrictedColorSpaces: Story = {
	args: {
		initialValue: { colorSpace: "srgb", components: [0, 0, 0] },
		options: { colorSpaces: ["srgb", "hsl"] },
	},
};
