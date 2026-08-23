/**
 * A pointer from one token's value to another token's path, identified by
 * the DTCG curly-brace alias syntax (`{a.b.c}`). May appear as a token's
 * entire `$value`, or nested inside a composite value's sub-fields.
 */
export interface TokenReference {
	/** The target's dot-separated path, e.g. `["color", "brand", "blue"]` for `{color.brand.blue}`. */
	readonly targetPath: readonly string[];
	/** Location of this reference within the token's `$value`. Empty when the
	 * whole value is the reference; otherwise the keys/indices leading to it. */
	readonly at: readonly (string | number)[];
	/** The original text, e.g. `"{color.brand.blue}"`, retained for display. */
	readonly raw: string;
}

/**
 * Detects the whole-string DTCG reference form: `{<body>}` as the entire
 * string, with a non-empty body containing no further `{` or `}`. Returns
 * `undefined` for anything else, including a string merely *containing*
 * braces (`"a {b} c"` is not a reference) — this is an ordinary "no" answer,
 * not a failure, so this function is pure, total, and never throws.
 */
export function parseReference(value: unknown): TokenReference | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	if (value.length < 3 || value[0] !== "{" || value.at(-1) !== "}") {
		return undefined;
	}
	const body = value.slice(1, -1);
	if (body.length === 0 || body.includes("{") || body.includes("}")) {
		return undefined;
	}
	return {
		targetPath: body.split("."),
		at: [],
		raw: value,
	};
}

function walk(
	node: unknown,
	at: readonly (string | number)[],
	results: TokenReference[],
): void {
	const reference = parseReference(node);
	if (reference !== undefined) {
		// A reference is a whole string; it can't also be an object or array,
		// so there's nothing further to descend into at this position.
		results.push({ ...reference, at });
		return;
	}
	if (Array.isArray(node)) {
		node.forEach((item, index) => {
			walk(item, [...at, index], results);
		});
		return;
	}
	if (typeof node === "object" && node !== null) {
		for (const [key, child] of Object.entries(node)) {
			walk(child, [...at, key], results);
		}
	}
}

/**
 * Walks a `$value` of any shape and returns every reference found inside
 * it, including references nested arbitrarily deep in a composite value
 * (e.g. a shadow token's `color` sub-field, or an entry in an array of
 * shadow layers). Pure and total, like `parseReference`.
 */
export function collectReferences(value: unknown): readonly TokenReference[] {
	const results: TokenReference[] = [];
	walk(value, [], results);
	return results;
}
