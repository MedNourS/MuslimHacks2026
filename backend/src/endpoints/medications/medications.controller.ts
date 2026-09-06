import { z } from "zod";
import { defineRoute, type BackonContext } from "@mednours/backon";
import * as service from "./medications.services";

function authedUserId(c: BackonContext) {
  return Number(c.get("auth")?.sub);
}

export const paramsSchema = z.object({ elderId: z.string().uuid() });
export const idParamsSchema = z.object({ id: z.string().uuid() });

export const createBodySchema = z.object({
  label: z.string().min(1, "Say what it is").max(100, "Keep it under 100 characters"),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, e.g. 08:00 or 19:30"),
});
export const create = defineRoute({ params: paramsSchema, body: createBodySchema }, async (c, { params, body }) => {
  const result = await service.create(authedUserId(c), params.elderId, body);
  return c.json(result, 201);
});

export const list = defineRoute({ params: paramsSchema }, async (c, { params }) => {
  const result = await service.list(authedUserId(c), params.elderId);
  return c.json(result);
});

export const remove = defineRoute({ params: idParamsSchema }, async (c, { params }) => {
  const result = await service.remove(authedUserId(c), params.id);
  return c.json(result);
});
