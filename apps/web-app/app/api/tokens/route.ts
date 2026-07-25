import { getConfig } from "../../../lib/config.ts";
import { scanTokenDirectory } from "../../../lib/tokens/scan.ts";

export async function GET(): Promise<Response> {
  const config = getConfig();
  const files = await scanTokenDirectory(config.tokensDir);
  return Response.json({ files });
}
