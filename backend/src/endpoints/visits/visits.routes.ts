import { Hono, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import { requireAuthCookie } from "../../middleware/cookie-auth.middleware";
import * as controller from "./visits.controller";

export const visitsRoutes = new Hono<Env>();

visitsRoutes.use("*", requireAuthCookie({ secret: jwtSecret() }));

visitsRoutes.post("/:elderId", controller.create);
visitsRoutes.get("/:elderId", controller.list);
