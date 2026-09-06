import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { careCircleMembers, elders, users } from "../../config/schema";
import type { createBodySchema, joinBodySchema } from "./elders.controller";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

async function uniqueInviteCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const existing = await db.query.elders.findFirst({ where: eq(elders.inviteCode, code) });
    if (!existing) return code;
  }
  throw new AppError(500, "invite_code_exhausted", "Could not generate a unique invite code");
}

export async function create(userId: number, body: z.infer<typeof createBodySchema>) {
  const inviteCode = await uniqueInviteCode();

  const [elder] = await db
    .insert(elders)
    .values({ fullName: body.fullName, primaryContactId: userId, inviteCode, area: body.area, address: body.address })
    .returning();

  await db.insert(careCircleMembers).values({ elderId: elder.id, userId, role: "family" });

  return elder;
}

export async function join(userId: number, body: z.infer<typeof joinBodySchema>) {
  const code = body.inviteCode.trim().toUpperCase();
  const elder = await db.query.elders.findFirst({ where: eq(elders.inviteCode, code) });
  if (!elder) {
    throw new AppError(404, "invite_not_found", "No circle found for that invite code");
  }

  const existing = await db.query.careCircleMembers.findFirst({
    where: and(eq(careCircleMembers.elderId, elder.id), eq(careCircleMembers.userId, userId)),
  });
  if (existing) {
    throw new AppError(409, "already_member", "You're already in this circle");
  }

  if (body.asElder) {
    const existingElder = await db.query.careCircleMembers.findFirst({
      where: and(eq(careCircleMembers.elderId, elder.id), eq(careCircleMembers.role, "elder")),
    });
    if (existingElder) {
      throw new AppError(409, "elder_already_linked", "This circle already has an elder account linked");
    }
  }

  await db.insert(careCircleMembers).values({ elderId: elder.id, userId, role: body.asElder ? "elder" : "family" });
  return elder;
}

export async function list(userId: number) {
  return db
    .select({
      id: elders.id,
      fullName: elders.fullName,
      inviteCode: elders.inviteCode,
      role: careCircleMembers.role,
    })
    .from(careCircleMembers)
    .innerJoin(elders, eq(careCircleMembers.elderId, elders.id))
    .where(eq(careCircleMembers.userId, userId));
}

export async function getById(userId: number, elderId: string) {
  const membership = await db.query.careCircleMembers.findFirst({
    where: and(eq(careCircleMembers.elderId, elderId), eq(careCircleMembers.userId, userId)),
  });
  if (!membership) {
    throw new AppError(404, "not_found", "Circle not found");
  }

  const elder = await db.query.elders.findFirst({ where: eq(elders.id, elderId) });
  if (!elder) {
    throw new AppError(404, "not_found", "Circle not found");
  }

  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: careCircleMembers.role,
    })
    .from(careCircleMembers)
    .innerJoin(users, eq(careCircleMembers.userId, users.id))
    .where(eq(careCircleMembers.elderId, elderId));

  return {
    id: elder.id,
    fullName: elder.fullName,
    inviteCode: elder.inviteCode,
    area: elder.area,
    // Precise address: only ever returned here, gated by the membership check above. Never
    // included in the open-postings browse list (see visits.services.ts listOpen()).
    address: elder.address,
    role: membership.role,
    members,
  };
}
