import { Hono, type Env } from "@mednours/backon";
import * as controller from "./users.controller";

export const usersRoutes = new Hono<Env>();

usersRoutes.get("/", controller.list);

usersRoutes.post("/", controller.create);

usersRoutes.get("/:id", controller.getById);

usersRoutes.put("/:id", controller.update);

usersRoutes.delete("/:id", controller.remove);
