import { getConfig } from "../lib/config.ts";
import { scanTokenDirectory } from "../lib/tokens/scan.ts";
import { FolderOverview } from "../components/FolderOverview.tsx";

// The configured directory is scanned fresh on every request (no
// file-watching/caching per this feature's NFRs) — without this, Next
// would statically prerender this page once at build time and never
// reflect the directory's actual state at request time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const config = getConfig();
  const result = await scanTokenDirectory(config.tokensDir);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Token Files</h1>
      <p style={{ opacity: 0.7 }}>{config.tokensDir}</p>
      {result.isOk() ? (
        <FolderOverview files={result.value} />
      ) : (
        <p role="alert">Could not scan the configured token directory.</p>
      )}
    </main>
  );
}
