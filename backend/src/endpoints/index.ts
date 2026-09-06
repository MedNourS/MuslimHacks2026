import { Hono } from "@mednours/backon";
import { authRoutes } from "./auth/auth.routes";
import { eldersRoutes } from "./elders/elders.routes";
import { timelineRoutes } from "./timeline/timeline.routes";
import { visitsRoutes } from "./visits/visits.routes";
import { cronRoutes } from "./cron/cron.routes";
import { medicationsRoutes } from "./medications/medications.routes";

export const endpoints = new Hono();

endpoints.route("/auth", authRoutes);
endpoints.route("/elders", eldersRoutes);
endpoints.route("/timeline", timelineRoutes);
endpoints.route("/visits", visitsRoutes);
endpoints.route("/cron", cronRoutes);
endpoints.route("/medications", medicationsRoutes);
