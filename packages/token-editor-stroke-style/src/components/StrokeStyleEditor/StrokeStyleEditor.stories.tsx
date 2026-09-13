import type { StrokeStyleValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { StrokeStyleEditor } from "./StrokeStyleEditor.tsx";

function ControlledStrokeStyleEditor(props: {
	readonly initialValue: StrokeStyleValue;
}) {
	const [value, setValue] = useState<StrokeStyleValue>(props.initialValue);
	return <StrokeStyleEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/StrokeStyleEditor",
	component: ControlledStrokeStyleEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledStrokeStyleEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Named: Story = {
	args: {
		initialValue: "dashed",
	},
};

export const CustomDashPattern: Story = {
	args: {
		initialValue: {
			dashArray: [
				{ value: 4, unit: "px" },
				{ value: 2, unit: "px" },
			],
			lineCap: "round",
		},
	},
};
