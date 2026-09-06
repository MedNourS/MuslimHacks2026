import { z } from "zod";
import { defineRoute, type BackonContext } from "@mednours/backon";
import * as service from "./visits.services";

function authedUserId(c: BackonContext) {
  return Number(c.get("auth")?.sub);
}

export const paramsSchema = z.object({ elderId: z.string().uuid() });
export const visitParamsSchema = z.object({ visitId: z.string().uuid() });

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

// Cross-elder browse for volunteers — every currently-open posting, area-only (never an address).
export const listOpen = defineRoute({}, async (c) => {
  const result = await service.listOpen(authedUserId(c));
  return c.json(result);
});

export const listMine = defineRoute({}, async (c) => {
  const result = await service.listMine(authedUserId(c));
  return c.json(result);
});

export const claim = defineRoute({ params: visitParamsSchema }, async (c, { params }) => {
  const result = await service.claim(authedUserId(c), params.visitId);
  return c.json(result);
});

export const confirm = defineRoute({ params: visitParamsSchema }, async (c, { params }) => {
  const result = await service.confirm(authedUserId(c), params.visitId);
  return c.json(result);
});

export const decline = defineRoute({ params: visitParamsSchema }, async (c, { params }) => {
  const result = await service.decline(authedUserId(c), params.visitId);
  return c.json(result);
});

export const cancel = defineRoute({ params: visitParamsSchema }, async (c, { params }) => {
  const result = await service.cancel(authedUserId(c), params.visitId);
  return c.json(result);
});

export const geoBodySchema = z.object({
  lat: z.string().min(1, "Location is required"),
  lng: z.string().min(1, "Location is required"),
});
export const checkIn = defineRoute({ params: visitParamsSchema, body: geoBodySchema }, async (c, { params, body }) => {
  const result = await service.checkIn(authedUserId(c), params.visitId, body);
  return c.json(result);
});

export const checkOut = defineRoute({ params: visitParamsSchema, body: geoBodySchema }, async (c, { params, body }) => {
  const result = await service.checkOut(authedUserId(c), params.visitId, body);
  return c.json(result);
});
