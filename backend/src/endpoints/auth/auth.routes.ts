import { Hono, type Env } from "@mednours/backon";
import * as controller from "./auth.controller";

export const authRoutes = new Hono<Env>();

authRoutes.post("/signup", controller.signup);

authRoutes.post("/login", controller.login);
