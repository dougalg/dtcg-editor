// Activates `@vitest/browser`'s jest-dom-compatible matcher types
// (`toHaveAccessibleName`, etc.) project-wide via its `vitest` module
// augmentation, so `tsc -p tsconfig.json` (this package's build step) can
// type-check `*.a11y.test.tsx` files that use them.
import type {} from "@vitest/browser/matchers";
