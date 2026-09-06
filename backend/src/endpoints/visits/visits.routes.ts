import { Hono, type Env } from "@mednours/backon";
import { jwtSecret } from "../auth/auth.services";
import { requireAuthCookie } from "../../middleware/cookie-auth.middleware";
import * as controller from "./visits.controller";

export const visitsRoutes = new Hono<Env>();

visitsRoutes.use("*", requireAuthCookie({ secret: jwtSecret() }));

// Static routes first: Hono still matches "/open" correctly against "/:elderId" either way,
// but keeping literal paths ahead of dynamic ones here for clarity.
visitsRoutes.get("/open", controller.listOpen);
visitsRoutes.get("/mine", controller.listMine);

visitsRoutes.post("/:elderId", controller.create);
visitsRoutes.get("/:elderId", controller.list);

visitsRoutes.post("/:visitId/claim", controller.claim);
visitsRoutes.post("/:visitId/confirm", controller.confirm);
visitsRoutes.post("/:visitId/decline", controller.decline);
visitsRoutes.post("/:visitId/cancel", controller.cancel);
visitsRoutes.post("/:visitId/check-in", controller.checkIn);
visitsRoutes.post("/:visitId/check-out", controller.checkOut);
