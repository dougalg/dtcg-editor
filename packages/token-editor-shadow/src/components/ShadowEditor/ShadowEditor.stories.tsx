import type { ShadowValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ShadowEditor } from "./ShadowEditor.tsx";

function ControlledShadowEditor(props: { readonly initialValue: ShadowValue }) {
	const [value, setValue] = useState(props.initialValue);
	return <ShadowEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/ShadowEditor",
	component: ControlledShadowEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledShadowEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleLayer: Story = {
	args: {
		initialValue: {
			color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.25 },
			offsetX: { value: 0, unit: "px" },
			offsetY: { value: 2, unit: "px" },
			blur: { value: 4, unit: "px" },
			spread: { value: 0, unit: "px" },
		},
	},
};

export const MultipleLayers: Story = {
	args: {
		initialValue: [
			{
				color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.2 },
				offsetX: { value: 0, unit: "px" },
				offsetY: { value: 1, unit: "px" },
				blur: { value: 2, unit: "px" },
				spread: { value: 0, unit: "px" },
			},
			{
				color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.1 },
				offsetX: { value: 0, unit: "px" },
				offsetY: { value: 4, unit: "px" },
				blur: { value: 8, unit: "px" },
				spread: { value: 0, unit: "px" },
			},
		],
	},
};
