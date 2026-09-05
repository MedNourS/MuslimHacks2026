import { Hono, requireAuth, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import * as controller from "./visits.controller";

export const visitsRoutes = new Hono<Env>();

visitsRoutes.use("*", requireAuth({ secret: jwtSecret() }));

visitsRoutes.post("/:elderId", controller.create);
visitsRoutes.get("/:elderId", controller.list);
