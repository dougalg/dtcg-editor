import { z } from "zod";

/**
 * Every DTCG node (token or group) is, at minimum, a plain JSON object.
 * Values are left as `unknown` here — this schema only validates the
 * envelope; `parseTokenFile` does the token/group discrimination and
 * per-key classification.
 */
export const RawNodeSchema = z.record(z.string(), z.unknown());

/**
 * The metadata fields recognized on every node, token or group.
 * `$deprecated` may be a boolean flag or a string deprecation message,
 * per the DTCG spec.
 */
export const NodeMetadataSchema = z.object({
  $type: z.string().optional(),
  $description: z.string().optional(),
  $deprecated: z.union([z.boolean(), z.string()]).optional(),
});

export type NodeMetadata = z.infer<typeof NodeMetadataSchema>;
