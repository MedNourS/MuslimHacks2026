import type { z } from "zod";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { AppError } from "@mednours/backon";
import { db } from "#config/db";
import { users } from "#config/schema";
import type { signupBodySchema, loginBodySchema } from "./auth.controller";

const password = (globalThis as unknown as {
  Bun: { password: { hash(password: string): Promise<string>; verify(password: string, hash: string): Promise<boolean> } };
}).Bun.password;

const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 30;

export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError(500, "config_error", "JWT_SECRET is not set");
  return secret;
}

async function issueToken(user: { id: number; email: string; name: string }) {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: String(user.id), email: user.email, name: user.name, iat: now, exp: now + JWT_EXPIRY_SECONDS },
    jwtSecret()
  );
}

function toPublicUser(user: { id: number; name: string; email: string; phoneNumber: string }) {
  return { id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber };
}

export async function signup(body: z.infer<typeof signupBodySchema>) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (existing) {
    throw new AppError(409, "email_taken", "An account with this email already exists");
  }

  const passwordHash = await password.hash(body.password);

  const [user] = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber,
      password: passwordHash,
    })
    .returning();

  const token = await issueToken(user);
  return { token, user: toPublicUser(user) };
}

export async function login(body: z.infer<typeof loginBodySchema>) {
  const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (!user) {
    throw new AppError(401, "invalid_credentials", "Incorrect email or password");
  }

  const valid = await password.verify(body.password, user.password);
  if (!valid) {
    throw new AppError(401, "invalid_credentials", "Incorrect email or password");
  }

  const token = await issueToken(user);
  return { token, user: toPublicUser(user) };
}
