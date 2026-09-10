// Public API surface for `@dtcg-editor/token-editor-color`.
//
// Consumption audit (main tree, excluding this package's own `src/` and the
// stale `packages/token-type-color/dist` build output):
//
//   [PROD]      imported by non-test code outside this package
//   [TEST-ONLY] the only importer outside this package is a *.test.* file
//   [WIRED]     no direct external importer; reaches consumers only through
//               `colorTokenType`'s contract fields
//   [UNUSED]    no importer anywhere outside this package (yet) — deliberate
//               public surface, no current consumer in this repo

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

// [WIRED] Only reached as `colorTokenType.Editor`. No file outside this
// package imports `ColorEditor` by name.
export { ColorEditor } from "./components/ColorEditor/ColorEditor.tsx";

// [WIRED] Only reached as `colorTokenType.Preview`.
export { ColorPreview } from "./components/ColorPreview/ColorPreview.tsx";

// [TEST-ONLY] Also reachable as `colorTokenType.ValidationErrorHandler`, but
// this standalone export exists so `apps/web-app/lib/token-editors/
// color-validation-error-handler.test.tsx` can render it directly.
export { ColorValidationErrorHandler } from "./components/ColorValidationErrorHandler/ColorValidationErrorHandler.tsx";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// [UNUSED] Public authoring type; no external importer.
export type { ColorEditorOptions } from "./configuration.ts";

export {
	// [WIRED] Only reached as `colorTokenType.editorOptionsSchema`.
	ColorEditorOptionsSchema,
	// [UNUSED] Public `defineConfig`-style helper; no external importer.
	defineColorConfig,
} from "./configuration.ts";

// ---------------------------------------------------------------------------
// Token type contract
// ---------------------------------------------------------------------------

// [PROD] The real entry point. `apps/web-app/lib/token-editors/built-in.ts`
// registers this; several web-app tests also import it. Everything above is
// wired into this object.
export { colorTokenType } from "./token-type.ts";

// ---------------------------------------------------------------------------
// Conversion utilities
// ---------------------------------------------------------------------------

// [UNUSED] All three types — no external importer.
export type {
	ChannelChange,
	ColorConversion,
	ConversionNote,
} from "./utils/conversion.ts";

// [UNUSED] Neither function is imported outside this package.
export { colorValueToSrgbHex, convertColorValue } from "./utils/conversion.ts";

// [UNUSED] No external importer.
export { colorValueToCssColor } from "./utils/css-color.ts";

// [UNUSED] No external importer.
export { formatChannel } from "./utils/format-channel.ts";

export {
	// [UNUSED] No external importer.
	COMPONENT_RANGES,
	// [UNUSED] No external importer.
	checkColorValueIssues,
} from "./utils/range-validation.ts";
