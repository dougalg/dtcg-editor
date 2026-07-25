/**
 * Injected logging surface, matching pino's call signature
 * (`logger.error(mergingObject, message?)`) so a real pino instance
 * satisfies this interface structurally. Only `error` exists today; more
 * levels are expected to be added as this repo's logging needs grow.
 */
export interface Logger {
  error(obj: Record<string, unknown>, msg?: string): void;
}

/** Default `Logger`, used when no logger is explicitly injected. */
export const consoleLogger: Logger = {
  error(obj, msg) {
    console.error(msg ?? "error", obj);
  },
};
