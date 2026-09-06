import { asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { careCircleMembers, medicationSchedules } from "../../config/schema";
import type { createBodySchema } from "./medications.controller";

async function assertMember(userId: number, elderId: string) {
  const membership = await db.query.careCircleMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.elderId, elderId), eq(m.userId, userId)),
  });
  if (!membership) {
    throw new AppError(404, "not_found", "Circle not found");
  }
}

export async function create(userId: number, elderId: string, body: z.infer<typeof createBodySchema>) {
  await assertMember(userId, elderId);

  const [row] = await db
    .insert(medicationSchedules)
    .values({ elderId, label: body.label, timeOfDay: body.timeOfDay })
    .returning();

  return row;
}

export async function list(userId: number, elderId: string) {
  await assertMember(userId, elderId);

  return db
    .select()
    .from(medicationSchedules)
    .where(eq(medicationSchedules.elderId, elderId))
    // Alphabetical on "HH:MM" is chronological, string sort works here without parsing.
    .orderBy(asc(medicationSchedules.timeOfDay));
}

export async function remove(userId: number, id: string) {
  const row = await db.query.medicationSchedules.findFirst({ where: eq(medicationSchedules.id, id) });
  if (!row) throw new AppError(404, "not_found", "Schedule entry not found");
  await assertMember(userId, row.elderId);

  await db.delete(medicationSchedules).where(eq(medicationSchedules.id, id));
  return { ok: true };
}
