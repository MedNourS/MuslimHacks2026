import { Hono, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import { requireAuthCookie } from "../../middleware/cookie-auth.middleware";
import * as controller from "./medications.controller";

export const medicationsRoutes = new Hono<Env>();

medicationsRoutes.use("*", requireAuthCookie({ secret: jwtSecret() }));

medicationsRoutes.post("/:elderId", controller.create);
medicationsRoutes.get("/:elderId", controller.list);
medicationsRoutes.delete("/:id", controller.remove);
