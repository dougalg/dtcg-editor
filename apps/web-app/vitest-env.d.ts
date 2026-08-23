// Activates `@vitest/browser`'s jest-dom-compatible matcher types
// (`toHaveAccessibleName`, etc.) project-wide via its `vitest` module
// augmentation — needed because this file, not the vitest config, is what
// `next build`'s tsc pass actually includes in its program.
import type {} from "@vitest/browser/matchers";
