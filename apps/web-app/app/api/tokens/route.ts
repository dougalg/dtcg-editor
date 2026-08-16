import type { Logger } from "@dtcg-editor/errors";
import { consoleLogger } from "@dtcg-editor/errors";
import { getConfig } from "../../../lib/config.ts";
import { scanTokenDirectory } from "../../../lib/tokens/scan.ts";

/**
 * Separated from `GET` so `logger` can be injected directly in tests —
 * Next.js's generated route types constrain `GET` itself to its exact
 * expected signature, leaving no room for a test-only parameter there.
 */
export async function listTokenFiles(
	logger: Logger = consoleLogger,
): Promise<Response> {
	const config = getConfig();
	const result = await scanTokenDirectory(config.tokensDir, logger);

	if (result.isErr()) {
		return Response.json(
			{ error: "Could not scan the configured token directory" },
			{ status: 500 },
		);
	}

	return Response.json({ files: result.value });
}

export async function GET(): Promise<Response> {
	return listTokenFiles();
}
