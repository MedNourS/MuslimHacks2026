import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { AppError, type BackonContext, type Next } from "@mednours/backon";

// Sessions live in an httpOnly cookie (not localStorage / a Bearer header) so a client-side
// XSS bug can't read the token off the page. This is a small hand-rolled stand-in for
// backon's own requireAuth(), which only reads `Authorization: Bearer`, everything else
// (payload shape, the "auth" context key, the 401 on failure) mirrors it exactly so every
// existing `c.get("auth")` call site keeps working unchanged.
export const SESSION_COOKIE = "care_circle_session";

export function requireAuthCookie(options: { secret: string }) {
  return async (c: BackonContext, next: Next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) throw new AppError(401, "unauthorized", "Unauthorized");

    try {
      const payload = await verify(token, options.secret, "HS256");
      c.set("auth", payload);
    } catch {
      throw new AppError(401, "unauthorized", "Unauthorized");
    }

    await next();
  };
}
