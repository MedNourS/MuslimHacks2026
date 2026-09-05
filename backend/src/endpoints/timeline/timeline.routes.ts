import { Hono, requireAuth, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import * as controller from "./timeline.controller";

export const timelineRoutes = new Hono<Env>();

timelineRoutes.use("*", requireAuth({ secret: jwtSecret() }));

timelineRoutes.post("/:elderId", controller.create);
timelineRoutes.get("/:elderId", controller.list);
