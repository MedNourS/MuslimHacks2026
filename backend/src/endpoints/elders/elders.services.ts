import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { careCircleMembers, elders } from "../../config/schema";
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
    .values({ fullName: body.fullName, primaryContactId: userId, inviteCode })
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

  await db.insert(careCircleMembers).values({ elderId: elder.id, userId, role: "family" });
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
