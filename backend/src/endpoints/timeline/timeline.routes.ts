import { Hono, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import { requireAuthCookie } from "../../middleware/cookie-auth.middleware";
import * as controller from "./timeline.controller";

export const timelineRoutes = new Hono<Env>();

timelineRoutes.use("*", requireAuthCookie({ secret: jwtSecret() }));

timelineRoutes.post("/:elderId", controller.create);
timelineRoutes.get("/:elderId", controller.list);
timelineRoutes.patch("/post/:postId", controller.update);
