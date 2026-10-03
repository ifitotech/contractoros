/**
 * Errors that a page chooses to survive (it shows a fallback instead of crashing) are still written to the server log,
 * so a real failure never disappears silently into "not found" or an empty list. Only the message is logged.
 */
export function logError(scope: string, error: unknown): void {
  const e = error as { message?: string; code?: string } | null;
  console.error(`[bidpower] ${scope}: ${e?.code ? `${e.code} ` : ""}${e?.message ?? String(error)}`.slice(0, 500));
}

/** `.catch(logged("clients", []))`: logs the failure and continues with the fallback. */
export function logged<T>(scope: string, fallback: T): (error: unknown) => T {
  return (error) => { logError(scope, error); return fallback; };
}
