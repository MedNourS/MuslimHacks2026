import { z } from "zod";
import { defineRoute, type BackonContext } from "@mednours/backon";
import * as service from "./elders.services";

function authedUserId(c: BackonContext) {
  return Number(c.get("auth")?.sub);
}

export const createBodySchema = z.object({
  fullName: z.string().min(1, "Name is required"),
});
export const create = defineRoute({ body: createBodySchema }, async (c, { body }) => {
  const result = await service.create(authedUserId(c), body);
  return c.json(result, 201);
});

export const joinBodySchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
});
export const join = defineRoute({ body: joinBodySchema }, async (c, { body }) => {
  const result = await service.join(authedUserId(c), body);
  return c.json(result);
});

export const list = defineRoute({}, async (c) => {
  const result = await service.list(authedUserId(c));
  return c.json(result);
});
