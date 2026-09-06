import { and, asc, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { careCircleMembers, elders, users, visits } from "../../config/schema";
import type { createBodySchema, geoBodySchema } from "./visits.controller";

async function requireMembership(userId: number, elderId: string) {
  const membership = await db.query.careCircleMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.elderId, elderId), eq(m.userId, userId)),
  });
  if (!membership) throw new AppError(404, "not_found", "Circle not found");
  return membership;
}

async function requireCoordinator(userId: number, elderId: string) {
  const membership = await requireMembership(userId, elderId);
  if (membership.role !== "family" && membership.role !== "elder") {
    throw new AppError(403, "forbidden", "Only the family or the elder can do this");
  }
  return membership;
}

async function requireVolunteer(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !user.wantsToVolunteer) {
    throw new AppError(403, "forbidden", "Turn on volunteering in your account to do this");
  }
  return user;
}

async function loadVisit(visitId: string) {
  const visit = await db.query.visits.findFirst({ where: eq(visits.id, visitId) });
  if (!visit) throw new AppError(404, "not_found", "Visit not found");
  return visit;
}

async function toSummary(visit: typeof visits.$inferSelect) {
  const [visitor, postedBy] = await Promise.all([
    visit.visitorId ? db.query.users.findFirst({ where: eq(users.id, visit.visitorId) }) : null,
    visit.postedById ? db.query.users.findFirst({ where: eq(users.id, visit.postedById) }) : null,
  ]);
  return {
    id: visit.id,
    elderId: visit.elderId,
    status: visit.status,
    scheduledAt: visit.scheduledAt,
    notes: visit.notes,
    createdAt: visit.createdAt,
    postedBy: postedBy ? { id: postedBy.id, name: postedBy.name } : null,
    visitor: visitor ? { id: visitor.id, name: visitor.name } : null,
    checkInAt: visit.checkInAt,
    checkOutAt: visit.checkOutAt,
  };
}

// Drops the volunteer's standing access to an elder's circle once they have no other active
// (confirmed) engagement with that elder — keeps "confirmed volunteer sees the real address"
// scoped to the actual engagement instead of lingering forever after one visit.
async function revokeVolunteerAccessIfDone(elderId: string, volunteerId: number) {
  const stillActive = await db.query.visits.findFirst({
    where: and(eq(visits.elderId, elderId), eq(visits.visitorId, volunteerId), eq(visits.status, "confirmed")),
  });
  if (stillActive) return;
  await db
    .delete(careCircleMembers)
    .where(
      and(
        eq(careCircleMembers.elderId, elderId),
        eq(careCircleMembers.userId, volunteerId),
        eq(careCircleMembers.role, "volunteer")
      )
    );
}

export async function create(userId: number, elderId: string, body: z.infer<typeof createBodySchema>) {
  await requireCoordinator(userId, elderId);
  const [visit] = await db
    .insert(visits)
    .values({
      elderId,
      postedById: userId,
      visitorId: null,
      status: "open",
      scheduledAt: new Date(body.scheduledAt),
      notes: body.notes,
    })
    .returning();
  return toSummary(visit);
}

export async function list(userId: number, elderId: string) {
  await requireMembership(userId, elderId);
  const rows = await db.query.visits.findMany({
    where: eq(visits.elderId, elderId),
    orderBy: asc(visits.scheduledAt),
  });
  return Promise.all(rows.map(toSummary));
}

export async function listOpen(userId: number) {
  await requireVolunteer(userId);
  const rows = await db
    .select({
      id: visits.id,
      elderId: visits.elderId,
      elderFullName: elders.fullName,
      area: elders.area,
      scheduledAt: visits.scheduledAt,
      notes: visits.notes,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .innerJoin(elders, eq(visits.elderId, elders.id))
    .where(eq(visits.status, "open"))
    .orderBy(desc(visits.createdAt));

  // First name only, and area instead of address — a browsing volunteer hasn't been matched yet.
  return rows.map((r) => ({
    id: r.id,
    elderId: r.elderId,
    elderFirstName: r.elderFullName.split(" ")[0],
    area: r.area,
    scheduledAt: r.scheduledAt,
    notes: r.notes,
    postedAt: r.createdAt,
  }));
}

export async function listMine(userId: number) {
  await requireVolunteer(userId);
  const rows = await db
    .select({
      id: visits.id,
      elderId: visits.elderId,
      elderFullName: elders.fullName,
      area: elders.area,
      address: elders.address,
      status: visits.status,
      scheduledAt: visits.scheduledAt,
      notes: visits.notes,
      checkInAt: visits.checkInAt,
      checkOutAt: visits.checkOutAt,
    })
    .from(visits)
    .innerJoin(elders, eq(visits.elderId, elders.id))
    .where(eq(visits.visitorId, userId))
    .orderBy(desc(visits.scheduledAt));

  // The precise address only ever shows once a claim is actually confirmed (or was, before it
  // completed) — never while still pending, matching the same rule as everywhere else.
  return rows.map((r) => ({
    id: r.id,
    elderId: r.elderId,
    elderFullName: r.elderFullName,
    area: r.area,
    address: r.status === "confirmed" || r.status === "completed" ? r.address : null,
    status: r.status,
    scheduledAt: r.scheduledAt,
    notes: r.notes,
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
  }));
}

export async function claim(userId: number, visitId: string) {
  await requireVolunteer(userId);
  const visit = await loadVisit(visitId);
  if (visit.status !== "open") {
    throw new AppError(409, "not_open", "This posting isn't open anymore");
  }
  const [updated] = await db
    .update(visits)
    .set({ status: "pending_family_confirm", visitorId: userId })
    .where(eq(visits.id, visitId))
    .returning();
  return toSummary(updated);
}

export async function confirm(userId: number, visitId: string) {
  const visit = await loadVisit(visitId);
  await requireCoordinator(userId, visit.elderId);
  if (visit.status !== "pending_family_confirm" || !visit.visitorId) {
    throw new AppError(409, "not_pending", "This posting isn't waiting on a confirmation");
  }
  const [updated] = await db
    .update(visits)
    .set({ status: "confirmed" })
    .where(eq(visits.id, visitId))
    .returning();

  const existingMembership = await db.query.careCircleMembers.findFirst({
    where: and(eq(careCircleMembers.elderId, visit.elderId), eq(careCircleMembers.userId, visit.visitorId)),
  });
  if (!existingMembership) {
    await db.insert(careCircleMembers).values({ elderId: visit.elderId, userId: visit.visitorId, role: "volunteer" });
  }

  return toSummary(updated);
}

export async function decline(userId: number, visitId: string) {
  const visit = await loadVisit(visitId);
  await requireCoordinator(userId, visit.elderId);
  if (visit.status !== "pending_family_confirm") {
    throw new AppError(409, "not_pending", "This posting isn't waiting on a confirmation");
  }
  const [updated] = await db
    .update(visits)
    .set({ status: "open", visitorId: null })
    .where(eq(visits.id, visitId))
    .returning();
  return toSummary(updated);
}

export async function cancel(userId: number, visitId: string) {
  const visit = await loadVisit(visitId);
  const isVisitor = visit.visitorId === userId;
  if (!isVisitor) {
    await requireCoordinator(userId, visit.elderId);
  }
  if (visit.status === "cancelled" || visit.status === "completed") {
    throw new AppError(409, "already_closed", "This visit is already closed out");
  }
  const [updated] = await db.update(visits).set({ status: "cancelled" }).where(eq(visits.id, visitId)).returning();
  if (visit.visitorId) {
    await revokeVolunteerAccessIfDone(visit.elderId, visit.visitorId);
  }
  return toSummary(updated);
}

export async function checkIn(userId: number, visitId: string, body: z.infer<typeof geoBodySchema>) {
  const visit = await loadVisit(visitId);
  if (visit.visitorId !== userId) {
    throw new AppError(403, "forbidden", "You're not the volunteer on this visit");
  }
  if (visit.status !== "confirmed") {
    throw new AppError(409, "not_confirmed", "This visit isn't confirmed yet");
  }
  if (visit.checkInAt) {
    throw new AppError(409, "already_checked_in", "Already checked in");
  }
  const [updated] = await db
    .update(visits)
    .set({ checkInAt: new Date(), checkInLat: body.lat, checkInLng: body.lng })
    .where(eq(visits.id, visitId))
    .returning();
  return toSummary(updated);
}

export async function checkOut(userId: number, visitId: string, body: z.infer<typeof geoBodySchema>) {
  const visit = await loadVisit(visitId);
  if (visit.visitorId !== userId) {
    throw new AppError(403, "forbidden", "You're not the volunteer on this visit");
  }
  if (!visit.checkInAt) {
    throw new AppError(409, "not_checked_in", "Check in first");
  }
  if (visit.checkOutAt) {
    throw new AppError(409, "already_checked_out", "Already checked out");
  }
  const [updated] = await db
    .update(visits)
    .set({ checkOutAt: new Date(), checkOutLat: body.lat, checkOutLng: body.lng, status: "completed" })
    .where(eq(visits.id, visitId))
    .returning();
  await revokeVolunteerAccessIfDone(visit.elderId, userId);
  return toSummary(updated);
}
