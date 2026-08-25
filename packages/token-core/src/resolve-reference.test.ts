import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReference } from "./reference.ts";
import type { LookupHit, ReferenceLookup } from "./resolve-reference.ts";
import { resolveReference } from "./resolve-reference.ts";
import type { TokenNode } from "./types.ts";

function token(value: unknown, declaredType = "color"): TokenNode {
	return {
		kind: "token",
		name: "t",
		path: [],
		value,
		declaredType,
		description: undefined,
		deprecated: undefined,
		extensions: {},
		effectiveType: declaredType,
		effectiveDeprecated: undefined,
		inferredType: undefined,
	};
}

/** A `ReferenceLookup` backed by a plain path->node map, for tests. */
function lookupFrom(
	entries: Record<
		string,
		{ value: unknown; file?: string; mode?: string; type?: string }
	>,
	groups: readonly string[] = [],
): ReferenceLookup {
	return (path) => {
		const key = path.join(".");
		if (groups.includes(key)) {
			const hit: LookupHit = {
				node: {
					kind: "group",
					name: "g",
					path,
					declaredType: undefined,
					description: undefined,
					deprecated: undefined,
					extensions: {},
					children: new Map(),
					effectiveType: undefined,
					effectiveDeprecated: undefined,
				},
				effectiveType: undefined,
				file: "somewhere.json",
				mode: undefined,
			};
			return hit;
		}
		const entry = entries[key];
		if (entry === undefined) {
			return undefined;
		}
		return {
			node: token(entry.value, entry.type ?? "color"),
			effectiveType: entry.type ?? "color",
			file: entry.file ?? "tokens.json",
			mode: entry.mode,
		};
	};
}

const reference = (raw: string) => {
	const parsed = parseReference(raw);
	if (parsed === undefined) {
		throw new Error(`test fixture reference string is not valid: ${raw}`);
	}
	return parsed;
};

test("resolves a single-hop reference to a literal value", () => {
	const lookup = lookupFrom({
		"color.brand.blue": {
			value: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
		},
	});
	const chain = resolveReference(reference("{color.brand.blue}"), lookup);
	assert.equal(chain.outcome.kind, "resolved");
	assert.equal(chain.steps.length, 1);
	assert.deepEqual(chain.steps[0]?.path, ["color", "brand", "blue"]);
});

test("resolves a 3-hop chain to the literal at its end, retaining every step in order", () => {
	const lookup = lookupFrom({
		"color.action.hover": { value: "{color.action.default}" },
		"color.action.default": { value: "{color.text.primary}" },
		"color.text.primary": { value: "{color.brand.blue}" },
		"color.brand.blue": {
			value: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
		},
	});
	const chain = resolveReference(reference("{color.action.hover}"), lookup);
	assert.equal(chain.outcome.kind, "resolved");
	if (chain.outcome.kind === "resolved") {
		assert.deepEqual(chain.outcome.value, {
			colorSpace: "srgb",
			components: [0.2, 0.4, 0.9],
		});
	}
	assert.deepEqual(
		chain.steps.map((s) => s.path.join(".")),
		[
			"color.action.hover",
			"color.action.default",
			"color.text.primary",
			"color.brand.blue",
		],
	);
});

test("carries file and mode through each step", () => {
	const lookup = lookupFrom({
		a: { value: "{b}", file: "semantic.json", mode: "dark" },
		b: { value: { hex: "#fff" }, file: "base.json", mode: "dark" },
	});
	const chain = resolveReference(reference("{a}"), lookup);
	assert.deepEqual(
		chain.steps.map((s) => [s.file, s.mode]),
		[
			["semantic.json", "dark"],
			["base.json", "dark"],
		],
	);
});

test("reports resolved.type as the final token's effective type", () => {
	const lookup = lookupFrom({
		a: { value: "{b}", type: "color" },
		b: { value: { hex: "#fff" }, type: "color" },
	});
	const chain = resolveReference(reference("{a}"), lookup);
	assert.equal(chain.outcome.kind, "resolved");
	if (chain.outcome.kind === "resolved") {
		assert.equal(chain.outcome.type, "color");
	}
});

test("reports unresolved for a target that does not exist", () => {
	const chain = resolveReference(reference("{color.nope}"), lookupFrom({}));
	assert.deepEqual(chain.outcome, {
		kind: "unresolved",
		missingPath: ["color", "nope"],
	});
	assert.equal(chain.steps.length, 0);
});

test("reports unresolved for a target reached partway through a chain", () => {
	const lookup = lookupFrom({
		a: { value: "{b}" },
		// "b" is missing
	});
	const chain = resolveReference(reference("{a}"), lookup);
	assert.deepEqual(chain.outcome, { kind: "unresolved", missingPath: ["b"] });
	// "a" itself was found (and is a real step traversed) before "b" turned
	// up missing — only the chain's continuation past "a" is unresolved.
	assert.equal(chain.steps.length, 1);
});

test("reports group-target for a reference whose target is a group, not a token", () => {
	const chain = resolveReference(
		reference("{color.group}"),
		lookupFrom({}, ["color.group"]),
	);
	assert.deepEqual(chain.outcome, {
		kind: "group-target",
		groupPath: ["color", "group"],
	});
});

test("detects a direct 2-cycle rather than looping forever", () => {
	// resolveReference is synchronous, so no external timeout can interrupt
	// a true infinite loop — this test's own completion is the regression
	// guard: if the `visited` check in resolve-reference.ts is ever removed
	// or broken, this test hangs the whole run rather than failing cleanly,
	// which is what makes a broken cycle guard impossible to merge silently.
	const lookup = lookupFrom({
		"color.a": { value: "{color.b}" },
		"color.b": { value: "{color.a}" },
	});
	const chain = resolveReference(reference("{color.a}"), lookup);
	assert.equal(chain.outcome.kind, "circular");
	if (chain.outcome.kind === "circular") {
		assert.deepEqual(chain.outcome.cyclePath, ["color", "a"]);
	}
});

test("detects a longer cycle without hanging", () => {
	const lookup = lookupFrom({
		a: { value: "{b}" },
		b: { value: "{c}" },
		c: { value: "{d}" },
		d: { value: "{b}" },
	});
	const chain = resolveReference(reference("{a}"), lookup);
	assert.equal(chain.outcome.kind, "circular");
});

test("a self-reference is detected as circular", () => {
	const lookup = lookupFrom({ a: { value: "{a}" } });
	const chain = resolveReference(reference("{a}"), lookup);
	assert.equal(chain.outcome.kind, "circular");
});
