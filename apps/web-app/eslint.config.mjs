import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Dependency Injection for I/O/Platform Externalities (see docs/project.md):
// direct calls to these externalities are banned everywhere in apps/web-app
// except the designated adapter/composition-root files, which turn the
// relevant selector(s) back off below via a filtered copy of this array,
// since ESLint doesn't support toggling a single no-restricted-syntax array
// entry — see apps/web-app/eslint.config.mjs's per-file override blocks.
const restrictedSyntax = [
  {
    selector: "CallExpression[callee.object.name='process'][callee.property.name='exit']",
    message: "Inject an onFatalError-shaped dependency instead of calling process.exit directly.",
  },
  {
    selector: "MemberExpression[object.name='console']",
    message: "Inject a Logger instead of calling console directly.",
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: "Inject an env-lookup dependency instead of reading process.env directly.",
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: "Inject a clock dependency instead of calling Date.now() directly.",
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: "Inject a clock dependency instead of calling new Date() directly.",
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: "Inject a randomness dependency instead of calling Math.random() directly.",
  },
  {
    selector: "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues)$/]",
    message: "Inject a randomness dependency instead of calling crypto directly.",
  },
];

// Shared by the lib/fatal-startup-error.ts and scripts/init-config.ts
// override blocks below — both are process.exit/console.error composition
// roots that get the same two selectors turned back off.
const restrictedSyntaxWithoutProcessExitOrConsole = restrictedSyntax.filter(
  ({ selector }) =>
    selector !== "CallExpression[callee.object.name='process'][callee.property.name='exit']" &&
    selector !== "MemberExpression[object.name='console']",
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        version: "19",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "node:fs",
              message: "Import fs bindings only in lib/platform/node-fs.ts; inject them as a parameter elsewhere.",
            },
            {
              name: "node:fs/promises",
              message: "Import fs bindings only in lib/platform/node-fs.ts; inject them as a parameter elsewhere.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Inject fetch as a parameter; see useSaveTokenEdits.ts's own default-parameter declaration.",
        },
      ],
      "no-restricted-syntax": ["error", ...restrictedSyntax],
    },
  },
  // Sole real-fs adapter (AC-01) — the only file permitted to import from
  // node:fs/node:fs/promises for use outside a default-parameter position.
  {
    files: ["lib/platform/node-fs.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Single-call-site fetch composition root (FR-01/FR-06) — its own
  // `fetchImpl: typeof fetch = fetch` default-parameter declaration.
  {
    files: ["hooks/useSaveTokenEdits.ts"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
  // Sole real process.exit/console.error call site (Flagged Decision 1) —
  // reached only via instrumentation.ts's dynamic import().
  {
    files: ["lib/fatal-startup-error.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...restrictedSyntaxWithoutProcessExitOrConsole],
    },
  },
  // CLI thin-wrapper composition root (`main()`); `runInitConfig` itself has
  // zero direct calls to either after the DI refactor, so a file-level
  // exemption is safe.
  {
    files: ["scripts/init-config.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...restrictedSyntaxWithoutProcessExitOrConsole],
    },
  },
  // Route Handler integration tests (gap in plan.md's Phase 5 exemption
  // list, found while implementing it): route.ts's GET/PATCH have no
  // injectable fs parameter of their own — feature.md's audit explicitly
  // scoped them as "already delegate all fs access to read.ts/write.ts, no
  // additional direct-call sites exist there" and never listed these test
  // files among FR-07's mock-rewrite targets. Exercising the Route Handler
  // boundary end-to-end therefore requires a real fixture directory so
  // read.ts/scan.ts/write.ts's real (default) fs adapters have something to
  // read/write — this is deliberate integration-test scope, not a missed
  // DI call site.
  {
    files: ["app/api/tokens/route.test.ts", "app/api/tokens/*/route.test.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Next.js register() composition root — its own process.env.NEXT_RUNTIME
  // read (see Flagged Decision 4: config.ts does NOT get this exemption).
  {
    files: ["instrumentation.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...restrictedSyntax.filter(
          ({ selector }) => selector !== "MemberExpression[object.name='process'][property.name='env']",
        ),
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist-test/**",
  ]),
]);

export default eslintConfig;
