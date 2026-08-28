import type { Preview } from "@storybook/react-vite";

import "../packages/design-system/dist/styles/tokens.css";
import "../packages/design-system/src/styles/global/global.css";

// Design-system components don't import their own (non-module) CSS — each
// consuming app opts into exactly the components it uses (see
// apps/web-app/app/globals.css). Storybook previews every component, so it
// loads all of them eagerly instead of hand-listing each one here.
import.meta.glob("../packages/design-system/src/components/*/*.css", {
	eager: true,
});

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
