import type { TransitionValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TransitionEditor } from "./TransitionEditor.tsx";

function ControlledTransitionEditor(props: {
	readonly initialValue: TransitionValue;
}) {
	const [value, setValue] = useState(props.initialValue);
	return <TransitionEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/TransitionEditor",
	component: ControlledTransitionEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledTransitionEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		initialValue: {
			duration: { value: 200, unit: "ms" },
			delay: { value: 0, unit: "ms" },
			timingFunction: [0.4, 0, 0.2, 1],
		},
	},
};

export const WithDelay: Story = {
	args: {
		initialValue: {
			duration: { value: 300, unit: "ms" },
			delay: { value: 100, unit: "ms" },
			timingFunction: [0, 0, 0.2, 1],
		},
	},
};
