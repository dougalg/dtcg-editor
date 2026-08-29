/*
 * Loads the design-system foundation plus the component stylesheets the
 * token editors render, so browser-mode a11y tests measure controls under
 * the same cascade as the app (see
 * packages/design-system/src/styles/base.css and
 * apps/web-app/app/globals.css) instead of bare user-agent defaults.
 *
 * Prepended to each package's own `vitest.setup.ts` by `a11yProject()` in
 * `vitest.config.ts`. a11y projects only — unit (jsdom) projects don't lay
 * out CSS, so they skip this.
 */
import "./packages/design-system/src/styles/base.css";
import "./packages/design-system/src/components/Button/Button.css";
import "./packages/design-system/src/components/Dialog/Dialog.css";
// Select.css is currently an unparseable disabled block — add once fixed.
