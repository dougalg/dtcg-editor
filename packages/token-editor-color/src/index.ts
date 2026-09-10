// Public API surface for `@dtcg-editor/token-editor-color`.
//
// `colorTokenType` is the entry point the web app registers
// (`apps/web-app/lib/token-editors/built-in.ts`). The three component
// exports below have no direct external importer today — they are reached
// through `colorTokenType`'s contract fields (`.Editor`, `.Preview`,
// `.editorOptionsSchema`) — but stay exported as the package's public
// component API. Everything else is imported only within this package and
// is intentionally not re-exported here; import it from its own module.

export { ColorEditor } from "./components/ColorEditor/ColorEditor.tsx";
export { ColorPreview } from "./components/ColorPreview/ColorPreview.tsx";
export { ColorEditorOptionsSchema } from "./configuration.ts";
export { colorTokenType } from "./token-type.ts";
