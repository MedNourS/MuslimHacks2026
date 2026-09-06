import type { Next } from "@mednours/backon";
import type { BackonContext } from "@mednours/backon";

/**
 * Example middleware, just to show the pattern, adds a response-time
 * header. Error handling, request logging, secure headers, CORS, and the
 * request body size limit are already wired into createApp() by backon
 * itself; a separate error.middleware.ts is only needed to override that
 * default behavior.
 */
export async function exampleMiddleware(c: BackonContext, next: Next) {
  const start = performance.now();
  await next();
  c.header("x-response-time-ms", String(Math.round(performance.now() - start)));
}
