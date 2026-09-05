import { desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { careCircleMembers, timelinePosts, users } from "../../config/schema";
import type { createBodySchema } from "./timeline.controller";

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

  const [post] = await db
    .insert(timelinePosts)
    .values({ elderId, authorId: userId, body: body.body })
    .returning();

  const author = await db.query.users.findFirst({ where: eq(users.id, userId) });

  return { id: post.id, body: post.body, createdAt: post.createdAt, author: { id: userId, name: author?.name ?? "" } };
}

export async function list(userId: number, elderId: string) {
  await assertMember(userId, elderId);

  const rows = await db
    .select({
      id: timelinePosts.id,
      body: timelinePosts.body,
      createdAt: timelinePosts.createdAt,
      authorId: users.id,
      authorName: users.name,
    })
    .from(timelinePosts)
    .innerJoin(users, eq(timelinePosts.authorId, users.id))
    .where(eq(timelinePosts.elderId, elderId))
    .orderBy(desc(timelinePosts.createdAt));

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    author: { id: r.authorId, name: r.authorName },
  }));
}
