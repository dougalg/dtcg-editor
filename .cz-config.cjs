const { types, scopes } = require("./commit-conventions.cjs");

module.exports = {
  types: types.map((t) => ({ value: t.value, name: `${t.value}:`.padEnd(10) + t.description })),
  scopes: scopes.map((s) => ({ name: s.value })),
  scopeOverrides: {},
  allowCustomScopes: false,
  allowBreakingChanges: ["feat", "fix"],
  skipQuestions: [],
  subjectLimit: 100,
};
