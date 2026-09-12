import type { DurationValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DurationEditor } from "./DurationEditor.tsx";

function ControlledDurationEditor(props: {
	readonly initialValue: DurationValue;
}) {
	const [value, setValue] = useState(props.initialValue);
	return <DurationEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/DurationEditor",
	component: ControlledDurationEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledDurationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Milliseconds: Story = {
	args: {
		initialValue: { value: 200, unit: "ms" },
	},
};

export const Seconds: Story = {
	args: {
		initialValue: { value: 1, unit: "s" },
	},
};
