import { z } from "zod";

/**
 * The wire shape of `GET /api/tokens/references` — the whole-directory
 * catalogue of token paths a reference could point at, plus each candidate's
 * own resolved preview. Validated here at the edge where the response body
 * re-enters the client (Validation at the Edges); `contracts/candidate-catalogue-api.md`
 * is the source of truth for this shape.
 */

const ChainStepSchema = z.object({
	path: z.array(z.string()),
	file: z.string(),
	mode: z.string().optional(),
});

const ChainOutcomeSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("resolved"),
		value: z.unknown(),
		type: z.string().optional(),
	}),
	z.object({
		kind: z.literal("unresolved"),
		missingPath: z.array(z.string()),
	}),
	z.object({
		kind: z.literal("group-target"),
		groupPath: z.array(z.string()),
	}),
	z.object({
		kind: z.literal("circular"),
		cyclePath: z.array(z.string()),
	}),
]);

/**
 * A resolution chain in wire form. `steps` is **required** (not optional):
 * the client's `candidate-selectability` derives "would repointing here close
 * a cycle?" from these steps without a second resolve.
 */
const ResolutionChainWireSchema = z.object({
	steps: z.array(ChainStepSchema),
	outcome: ChainOutcomeSchema,
});

const CandidateDefinitionSchema = z.object({
	mode: z.string().optional(),
	file: z.string(),
	rawValue: z.unknown(),
});

const ReferenceCandidateSchema = z.object({
	path: z.array(z.string()).min(1),
	displayPath: z.string(),
	effectiveType: z.string().optional(),
	definitions: z.array(CandidateDefinitionSchema).min(1),
	preview: z
		.array(
			z.object({
				mode: z.string().optional(),
				outcome: ResolutionChainWireSchema,
			}),
		)
		.min(1),
});

export const ReferenceCatalogueSchema = z.object({
	modes: z.array(z.string()),
	candidates: z.array(ReferenceCandidateSchema),
});

export type ReferenceCatalogue = z.infer<typeof ReferenceCatalogueSchema>;
export type ReferenceCandidate = z.infer<typeof ReferenceCandidateSchema>;
export type CandidateDefinition = z.infer<typeof CandidateDefinitionSchema>;
export type ResolutionChainWire = z.infer<typeof ResolutionChainWireSchema>;
