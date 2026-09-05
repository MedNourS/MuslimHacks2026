import { Hono, requireAuth, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import * as controller from "./elders.controller";

export const eldersRoutes = new Hono<Env>();

eldersRoutes.use("*", requireAuth({ secret: jwtSecret() }));

eldersRoutes.post("/", controller.create);
eldersRoutes.post("/join", controller.join);
eldersRoutes.get("/", controller.list);
eldersRoutes.get("/:id", controller.getById);
