import { Hono, type Env } from "@mednours/backon";
import * as controller from "./cron.controller";

export const cronRoutes = new Hono<Env>();

cronRoutes.get("/visit-digest", controller.visitDigest);
