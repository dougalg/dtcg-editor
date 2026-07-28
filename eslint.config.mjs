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
      "@typescript-eslint/no-explicit-any": "error",
      // Dependency Injection for I/O/Platform Externalities (see
      // docs/project.md): these categories have zero legitimate call sites
      // anywhere in packages/* today, so they're banned with no per-file
      // exemptions — this proactively blocks the pattern from being
      // reintroduced organically. fs/fetch/console/process.* restrictions
      // live only in apps/web-app/eslint.config.mjs (every real call site
      // and its designated exemption lives there; adding them here would be
      // vacuous for packages/* and never fire on the code they constrain).
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "Inject a clock dependency instead of calling Date.now() directly."
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Inject a clock dependency instead of calling new Date() directly."
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "Inject a randomness dependency instead of calling Math.random() directly."
        },
        {
          selector: "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues)$/]",
          message: "Inject a randomness dependency instead of calling crypto directly."
        }
      ]
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
