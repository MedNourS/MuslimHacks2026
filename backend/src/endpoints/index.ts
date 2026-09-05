import { Hono } from "@mednours/backon";
import { usersRoutes } from "./users/users.routes";
import { authRoutes } from "./auth/auth.routes";

export const endpoints = new Hono();

endpoints.route("/users", usersRoutes);
endpoints.route("/auth", authRoutes);
