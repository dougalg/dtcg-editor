import { TokenParseError } from "@dtcg-editor/token-core";
import { getConfig } from "../../../../lib/config.ts";
import { readAndParseTokenFile } from "../../../../lib/tokens/read.ts";
import { PathTraversalError } from "../../../../lib/tokens/path-safety.ts";
import { toPlainNode } from "../../../../lib/tokens/plain-node.ts";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT";
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const relativePath = path.join("/");
  const config = getConfig();

  try {
    const document = await readAndParseTokenFile(config.tokensDir, relativePath);
    return Response.json({ document: toPlainNode(document.root) });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof TokenParseError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (isFileNotFoundError(error)) {
      return Response.json({ error: `Token file not found: "${relativePath}"` }, { status: 404 });
    }
    throw error;
  }
}
