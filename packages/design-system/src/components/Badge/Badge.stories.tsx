import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./Badge";

const meta = {
	title: "Components/Badge",
	component: Badge,
	tags: ["autodocs"],
	args: {
		children: "Badge",
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
