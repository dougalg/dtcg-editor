const { types, scopes } = require("./commit-conventions.cjs");

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", types.map((t) => t.value)],
    "scope-enum": [2, "always", scopes.map((s) => s.value)],
  },
};
