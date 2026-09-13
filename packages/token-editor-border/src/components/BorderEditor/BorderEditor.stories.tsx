import type { BorderValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BorderEditor } from "./BorderEditor.tsx";

function ControlledBorderEditor(props: { readonly initialValue: BorderValue }) {
	const [value, setValue] = useState(props.initialValue);
	return <BorderEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/BorderEditor",
	component: ControlledBorderEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledBorderEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NamedStyle: Story = {
	args: {
		initialValue: {
			color: { colorSpace: "srgb", components: [0, 0, 0] },
			width: { value: 1, unit: "px" },
			style: "solid",
		},
	},
};

export const CustomDashPattern: Story = {
	args: {
		initialValue: {
			color: { colorSpace: "srgb", components: [0.2, 0.4, 0.8] },
			width: { value: 2, unit: "px" },
			style: { dashArray: [{ value: 4, unit: "px" }], lineCap: "round" },
		},
	},
};
