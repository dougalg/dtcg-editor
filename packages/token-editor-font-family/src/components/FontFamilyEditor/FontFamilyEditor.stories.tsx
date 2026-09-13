import type { FontFamilyValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FontFamilyEditor } from "./FontFamilyEditor.tsx";

function ControlledFontFamilyEditor(props: {
	readonly initialValue: FontFamilyValue;
}) {
	const [value, setValue] = useState<FontFamilyValue>(props.initialValue);
	return <FontFamilyEditor value={value} onChange={setValue} />;
}

const meta = {
	title: "Editors/FontFamilyEditor",
	component: ControlledFontFamilyEditor,
	tags: ["autodocs"],
} satisfies Meta<typeof ControlledFontFamilyEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleString: Story = {
	args: {
		initialValue: "Helvetica",
	},
};

export const FallbackStack: Story = {
	args: {
		initialValue: ["Helvetica", "Arial", "sans-serif"],
	},
};

export const Empty: Story = {
	args: {
		initialValue: [],
	},
};
