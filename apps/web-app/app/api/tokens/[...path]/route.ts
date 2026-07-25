import { TokenParseError } from "@dtcg-editor/token-core";
import { getConfig } from "../../../../lib/config.ts";
import { FileNotFoundError, readAndParseTokenFile } from "../../../../lib/tokens/read.ts";
import { PathTraversalError } from "../../../../lib/tokens/path-safety.ts";
import { toPlainNode } from "../../../../lib/tokens/plain-node.ts";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const relativePath = path.join("/");
  const config = getConfig();

  const result = await readAndParseTokenFile(config.tokensDir, relativePath);
  if (result.isOk()) {
    return Response.json({ document: toPlainNode(result.value.root) });
  }

  const error = result.error;
  if (error instanceof PathTraversalError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof FileNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof TokenParseError) {
    return Response.json({ error: error.message }, { status: 422 });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
