import type { Meta, StoryObj } from "@storybook/react-vite";

import { ColorField } from "./ColorField";

const meta = {
	title: "Components/ColorField",
	component: ColorField,
	tags: ["autodocs"],
} satisfies Meta<typeof ColorField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
