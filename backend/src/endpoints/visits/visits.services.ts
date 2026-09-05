import { asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { careCircleMembers, visits, users } from "../../config/schema";
import type { createBodySchema } from "./visits.controller";

async function assertMember(userId: number, elderId: string) {
  const membership = await db.query.careCircleMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.elderId, elderId), eq(m.userId, userId)),
  });
  if (!membership) throw new AppError(404, "not_found", "Circle not found");
}

export async function create(userId: number, elderId: string, body: z.infer<typeof createBodySchema>) {
  await assertMember(userId, elderId);
  const [visit] = await db
    .insert(visits)
    .values({ elderId, visitorId: userId, scheduledAt: new Date(body.scheduledAt), notes: body.notes })
    .returning();
  const visitor = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return {
    id: visit.id,
    scheduledAt: visit.scheduledAt,
    notes: visit.notes,
    createdAt: visit.createdAt,
    visitor: { id: userId, name: visitor?.name ?? "" },
  };
}

export async function list(userId: number, elderId: string) {
  await assertMember(userId, elderId);
  const rows = await db
    .select({
      id: visits.id,
      scheduledAt: visits.scheduledAt,
      notes: visits.notes,
      createdAt: visits.createdAt,
      visitorId: users.id,
      visitorName: users.name,
    })
    .from(visits)
    .innerJoin(users, eq(visits.visitorId, users.id))
    .where(eq(visits.elderId, elderId))
    .orderBy(asc(visits.scheduledAt));
  return rows.map((r) => ({
    id: r.id,
    scheduledAt: r.scheduledAt,
    notes: r.notes,
    createdAt: r.createdAt,
    visitor: { id: r.visitorId, name: r.visitorName },
  }));
}
