import type { z } from "zod";
import type { createBodySchema } from "./users.controller";
import type { getByIdParamsSchema } from "./users.controller";
import type { updateParamsSchema, updateBodySchema } from "./users.controller";
import type { removeParamsSchema } from "./users.controller";

// TODO: replace with real data access — e.g. import { db } from "#config/db";
export async function list() {
  return [];
}

// TODO: replace with real data access — e.g. import { db } from "#config/db";
export async function create(body: z.infer<typeof createBodySchema>) {
  return { id: crypto.randomUUID(), ...body };
}

// TODO: replace with real data access — e.g. import { db } from "#config/db";
export async function getById(params: z.infer<typeof getByIdParamsSchema>) {
  return null; // TODO: fetch the real record
}

// TODO: replace with real data access — e.g. import { db } from "#config/db";
export async function update(params: z.infer<typeof updateParamsSchema>, body: z.infer<typeof updateBodySchema>) {
  return { ...params, ...body };
}

// TODO: replace with real data access — e.g. import { db } from "#config/db";
export async function remove(params: z.infer<typeof removeParamsSchema>) {
  return { success: true };
}
