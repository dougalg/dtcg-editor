/**
 * commit-conventions.json is the single source of truth for allowed
 * Conventional Commits types and scopes. @commitlint/cz-commitlint (the
 * interactive `pnpm commit` CLI) reads its prompts from this file's rules
 * directly, so the two never drift apart.
 */
import commitConventions from "./commit-conventions.json" with { type: "json" };

const { types, scopes } = commitConventions;

/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [2, "always", types.map((t) => t.value)],
		"scope-enum": [2, "always", scopes.map((s) => s.value)],
	},
	prompt: {
		questions: {
			// Per-type descriptions in the interactive prompt list; the padded
			// "value:   description" display is computed by @commitlint/cz-commitlint
			// itself (see its getRuleQuestionConfig), not by this config.
			type: {
				enum: Object.fromEntries(
					types.map((t) => [t.value, { description: t.description }]),
				),
			},
			// No `enum` override here: @commitlint/cz-commitlint already lists the
			// scope-enum rule's values by default, matching the previous
			// cz-customizable config, which showed scope values with no description.
		},
	},
};
