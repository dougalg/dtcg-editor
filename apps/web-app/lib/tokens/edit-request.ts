import { z } from "zod";

/**
 * The shape of a `PATCH /api/tokens/[...path]` request body: a batch of
 * edits, each identifying a token by its current `path` and patching
 * `name`/`value`/`description`/`type`. Validated here, at the edge where
 * this request body first enters the system, per the Validation at the
 * Edges constraint — `value` is left as `unknown` since only a token-type
 * contract (not this generic edge) knows what a valid value looks like;
 * `type` is validated here only as "a string" — narrowing it to a
 * recognized `DtcgTokenType` happens downstream in `route.ts` via
 * `isDtcgTokenType`, the same edge pattern as the existing type-
 * authorization check.
 */
export const EditRequestSchema = z.object({
	edits: z
		.array(
			z.object({
				path: z.array(z.string()),
				name: z.string().optional(),
				value: z.unknown().optional(),
				description: z.string().optional(),
				type: z.string().optional(),
			}),
		)
		.min(1),
});

export type EditRequest = z.infer<typeof EditRequestSchema>;
