import { z } from "zod";
import { defineRoute, type BackonContext } from "@mednours/backon";
import * as service from "./visits.services";

function authedUserId(c: BackonContext) {
  return Number(c.get("auth")?.sub);
}

export const paramsSchema = z.object({ elderId: z.string().uuid() });

export const createBodySchema = z.object({
  scheduledAt: z.string().datetime({ message: "Pick a valid date and time" }),
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
});
export const create = defineRoute({ params: paramsSchema, body: createBodySchema }, async (c, { params, body }) => {
  const result = await service.create(authedUserId(c), params.elderId, body);
  return c.json(result, 201);
});

export const list = defineRoute({ params: paramsSchema }, async (c, { params }) => {
  const result = await service.list(authedUserId(c), params.elderId);
  return c.json(result);
});
