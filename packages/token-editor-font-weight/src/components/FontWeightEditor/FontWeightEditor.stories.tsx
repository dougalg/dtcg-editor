import type { FontWeightValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FontWeightEditor } from "./FontWeightEditor.tsx";

function ControlledFontWeightEditor(props: {
	readonly initialValue: FontWeightValue;
}) {
	const [value, setValue] = useState<FontWeightValue>(props.initialValue);
	return <FontWeightEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/FontWeightEditor",
	component: ControlledFontWeightEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledFontWeightEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Numeric: Story = {
	args: {
		initialValue: 400,
	},
};

export const Alias: Story = {
	args: {
		initialValue: "bold",
	},
};
