import { Hono, rateLimit, type Env } from "@mednours/backon";
import { requireAuthCookie } from "../../middleware/cookie-auth.middleware";
import { jwtSecret } from "./auth.services";
import * as controller from "./auth.controller";

export const authRoutes = new Hono<Env>();

// Tighter than the app-wide backstop in app.ts — login is the classic brute-force target,
// so it gets its own limit on top of that one.
authRoutes.use("/login", rateLimit({ windowMs: 60_000, max: 10 }));

authRoutes.post("/signup", controller.signup);

authRoutes.post("/login", controller.login);

authRoutes.post("/logout", controller.logout);

// Same reasoning as /login above — the classic target for someone hammering an endpoint,
// here to spam an inbox rather than to brute-force a password.
authRoutes.use("/forgot-password", rateLimit({ windowMs: 60_000, max: 5 }));
authRoutes.post("/forgot-password", controller.forgotPassword);
authRoutes.post("/reset-password", controller.resetPassword);

authRoutes.patch("/volunteer", requireAuthCookie({ secret: jwtSecret() }), controller.updateVolunteer);
