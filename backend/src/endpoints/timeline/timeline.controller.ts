import { z } from "zod";
import { defineRoute, type BackonContext } from "@mednours/backon";
import * as service from "./timeline.services";

function authedUserId(c: BackonContext) {
  return Number(c.get("auth")?.sub);
}

export const paramsSchema = z.object({ elderId: z.string().uuid() });

export const createBodySchema = z.object({
  body: z.string().min(1, "Write something first").max(2000, "Keep it under 2000 characters"),
});
export const create = defineRoute({ params: paramsSchema, body: createBodySchema }, async (c, { params, body }) => {
  const result = await service.create(authedUserId(c), params.elderId, body);
  return c.json(result, 201);
});

export const list = defineRoute({ params: paramsSchema }, async (c, { params }) => {
  const result = await service.list(authedUserId(c), params.elderId);
  return c.json(result);
});

export const postParamsSchema = z.object({ postId: z.string().uuid() });
export const updateBodySchema = z.object({
  body: z.string().min(1, "Write something first").max(2000, "Keep it under 2000 characters"),
});
export const update = defineRoute(
  { params: postParamsSchema, body: updateBodySchema },
  async (c, { params, body }) => {
    const result = await service.update(authedUserId(c), params.postId, body);
    return c.json(result);
  }
);
