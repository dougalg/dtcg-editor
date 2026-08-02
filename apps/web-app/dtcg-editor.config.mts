import { defineConfig } from "./lib/token-editors/define-config.ts";
// import { colorTokenType } from "@dtcg-editor/token-type-color/token-type";
// import { ColorEditor, defineColorConfig } from "@dtcg-editor/token-type-color";

export default defineConfig({
	tokensDir: "../../sample_data",
	extensions: [
		// { type: "color", editor: ColorEditor, editorOptions: defineColorConfig({ colorSpaces: ["srgb", "hsl", "oklch"] }) },
	],
});
