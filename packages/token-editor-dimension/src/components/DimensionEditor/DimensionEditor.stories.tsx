import type { DimensionValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DimensionEditor } from "./DimensionEditor.tsx";

function ControlledDimensionEditor(props: {
	readonly initialValue: DimensionValue;
}) {
	const [value, setValue] = useState(props.initialValue);
	return <DimensionEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/DimensionEditor",
	component: ControlledDimensionEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledDimensionEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pixels: Story = {
	args: {
		initialValue: { value: 16, unit: "px" },
	},
};

export const Rems: Story = {
	args: {
		initialValue: { value: 1, unit: "rem" },
	},
};
