// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**"
    ]
  },
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    // Root-level tooling config files are plain CommonJS by necessity (the
    // third-party tools that load them — commitlint, cz-customizable —
    // require() them directly), unlike every TS package in this monorepo.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
);
