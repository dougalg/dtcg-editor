import type { NumberValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { NumberEditor } from "./NumberEditor.tsx";

function ControlledNumberEditor(props: { readonly initialValue: NumberValue }) {
	const [value, setValue] = useState<NumberValue>(props.initialValue);
	return <NumberEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/NumberEditor",
	component: ControlledNumberEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledNumberEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Integer: Story = {
	args: {
		initialValue: 2,
	},
};

export const Fractional: Story = {
	args: {
		initialValue: 0.5,
	},
};

export const Negative: Story = {
	args: {
		initialValue: -1,
	},
};
