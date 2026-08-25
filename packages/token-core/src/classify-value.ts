import type { ZodType } from "zod";
import { ColorValueSchema } from "./color.ts";
import { DimensionValueSchema } from "./dimension.ts";
import type { DtcgTokenType } from "./token-types.ts";

/**
 * Every DTCG type this package currently has a real value schema for, in an
 * order-independent registry — adding a schema for another type (e.g.
 * `fontWeight`) automatically extends `classifyValue`'s coverage with no
 * further change here.
 */
const KNOWN_VALUE_SCHEMAS: readonly (readonly [DtcgTokenType, ZodType])[] = [
	["color", ColorValueSchema],
	["dimension", DimensionValueSchema],
];

/**
 * The shared matching algorithm behind `classifyValue`, parameterized over
 * the schema registry so the ambiguity branch (more than one schema
 * matching) is directly testable even though no two of this package's
 * *real* value schemas currently overlap.
 */
export function classifyAgainstSchemas(
	value: unknown,
	schemas: readonly (readonly [DtcgTokenType, ZodType])[],
): DtcgTokenType | undefined {
	let match: DtcgTokenType | undefined;
	for (const [type, schema] of schemas) {
		if (schema.safeParse(value).success) {
			if (match !== undefined) {
				return undefined;
			}
			match = type;
		}
	}
	return match;
}

/**
 * Infers a token's `$type` from the shape of its `$value` alone, for use
 * only when no `$type` is declared anywhere in the token's ancestor chain.
 * Returns the single `DtcgTokenType` whose known value schema matches, or
 * `undefined` if zero or more than one schema matches — a genuinely
 * ambiguous or unrecognized shape is never guessed at (FR-002).
 */
export function classifyValue(value: unknown): DtcgTokenType | undefined {
	return classifyAgainstSchemas(value, KNOWN_VALUE_SCHEMAS);
}
