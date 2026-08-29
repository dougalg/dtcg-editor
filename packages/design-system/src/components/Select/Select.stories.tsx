import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
} from "./Select.tsx";

const meta = {
	title: "Components/Select",
	component: Select,
	tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		"aria-label": "Colour space",
		defaultValue: "oklch",
		children: (
			<SelectContent>
				<SelectItem value="srgb">srgb</SelectItem>
				<SelectItem value="oklch">oklch</SelectItem>
				<SelectItem value="display-p3">display-p3</SelectItem>
				<SelectSeparator />
				<SelectItem value="lab">lab</SelectItem>
				<SelectItem value="lch">lch</SelectItem>
			</SelectContent>
		),
	},
};

export const Disabled: Story = {
	args: { ...Default.args, disabled: true },
};
