import type { ColorValue } from "@dtcg-editor/token-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { ColorEditorOptions } from "../../configuration.ts";
import { ColorEditor } from "./ColorEditor.tsx";

function ControlledColorEditor(props: {
	readonly initialValue: ColorValue;
	readonly options?: ColorEditorOptions;
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

/** A wide-gamut OKLCH colour outside the sRGB gamut — switching to `srgb`
 * opens the conversion dialog. */
export const OutOfGamut: Story = {
	args: {
		initialValue: { colorSpace: "oklch", components: [0.7, 0.3, 30] },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.selectOptions(
			canvas.getByRole("combobox", { name: "Colour space" }),
			"srgb",
		);
		const dialog = await within(document.body).findByRole("dialog");
		await expect(dialog).toBeInTheDocument();
		await expect(
			within(dialog).getByRole("button", { name: "Deny" }),
		).toBeInTheDocument();
	},
};

export const WithAlpha: Story = {
	args: {
		initialValue: {
			colorSpace: "oklch",
			components: [0.7, 0.15, 145],
			alpha: 0.5,
		},
	},
};

export const LegacyHex: Story = {
	args: {
		initialValue: "#1f75cb",
	},
};

export const NoneChannel: Story = {
	args: {
		initialValue: { colorSpace: "hsl", components: ["none", 50, 40] },
	},
};
