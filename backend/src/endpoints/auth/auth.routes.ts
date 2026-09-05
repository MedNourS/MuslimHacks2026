import { Hono, rateLimit, type Env } from "@mednours/backon";
import * as controller from "./auth.controller";

export const authRoutes = new Hono<Env>();

// Tighter than the app-wide backstop in app.ts — login is the classic brute-force target,
// so it gets its own limit on top of that one.
authRoutes.use("/login", rateLimit({ windowMs: 60_000, max: 10 }));

authRoutes.post("/signup", controller.signup);

authRoutes.post("/login", controller.login);

authRoutes.post("/logout", controller.logout);
