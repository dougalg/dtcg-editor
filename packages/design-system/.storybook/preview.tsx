import type { Preview } from "@storybook/react-vite";

import "../dist/styles/tokens.css";
import "../src/styles/global/global.css";
import "../src/components/ColorField/ColorField.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
