import { resolve, sep } from "node:path";

/** Thrown when a requested relative path would resolve outside the configured token directory. */
export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathTraversalError";
  }
}

/**
 * Resolves `requestedRelativePath` against `rootDir` and verifies the
 * result stays within `rootDir`. `rootDir` is trusted (comes from the
 * startup config); `requestedRelativePath` is not (comes from a client
 * request), so this guards against `..` traversal and absolute-path
 * segments escaping the configured root.
 */
export function resolveSafeTokenPath(rootDir: string, requestedRelativePath: string): string {
  const root = resolve(rootDir);
  const resolved = resolve(root, requestedRelativePath);

  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new PathTraversalError(`Requested path "${requestedRelativePath}" escapes the configured token directory`);
  }

  return resolved;
}
