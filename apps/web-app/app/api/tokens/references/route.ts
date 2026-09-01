import type { Logger } from "@dtcg-editor/errors";
import { consoleLogger } from "@dtcg-editor/errors";
import { getConfig } from "../../../../lib/config.ts";
import { loadTokenDirectory } from "../../../../lib/tokens/load-directory.ts";
import { buildReferenceCatalogue } from "../../../../lib/tokens/reference-catalogue.ts";
import { buildReferenceIndex } from "../../../../lib/tokens/reference-index.ts";
import { loadResolverModes } from "../../../../lib/tokens/resolver-file.ts";

/**
 * Separated from `GET` so `logger` can be injected in tests — Next.js's
 * generated route types pin `GET` to its exact signature. Builds the
 * whole-directory reference catalogue fresh on every request (no cache, no
 * invalidation — mirrors feature 007's per-request index). A directory-wide
 * read failure degrades to `500`; a present-but-invalid resolver file is
 * treated as "no modes" rather than an error (matches the token page).
 */
export async function listReferenceCatalogue(
	logger: Logger = consoleLogger,
): Promise<Response> {
	const { tokensDir } = getConfig();

	const loaded = await loadTokenDirectory(tokensDir, logger);
	if (loaded.isErr()) {
		return Response.json(
			{
				error: "Could not read the configured token directory",
				kind: "unknown",
			},
			{ status: 500 },
		);
	}

	const resolverResult = await loadResolverModes(tokensDir);
	const resolverModes = resolverResult.isOk()
		? resolverResult.value
		: undefined;

	const index = buildReferenceIndex(loaded.value.loaded, resolverModes);
	return Response.json(buildReferenceCatalogue(index));
}

export async function GET(): Promise<Response> {
	return listReferenceCatalogue();
}
