import type { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { sign } from "hono/jwt";
import { AppError } from "@mednours/backon";
import { db } from "../../config/db";
import { sendEmail } from "../../config/email";
import { passwordResetTokens, users, visits } from "../../config/schema";
import type { signupBodySchema, loginBodySchema, updateVolunteerBodySchema } from "./auth.controller";

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

function toPublicUser(user: {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  wantsToVolunteer: boolean;
  preferredArea: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    wantsToVolunteer: user.wantsToVolunteer,
    preferredArea: user.preferredArea,
  };
}

export async function signup(body: z.infer<typeof signupBodySchema>) {
  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, body.email), eq(users.phoneNumber, body.phoneNumber)),
  });
  if (existing) {
    if (existing.email === body.email) {
      throw new AppError(409, "email_taken", "An account with this email already exists");
    }
    throw new AppError(409, "phone_taken", "An account with this phone number already exists");
  }

  if (body.wantsToVolunteer && !body.preferredArea) {
    throw new AppError(400, "validation_error", "Add an area you're willing to help in");
  }

  const passwordHash = await password.hash(body.password);
  const wantsToVolunteer = body.wantsToVolunteer ?? false;

  const [user] = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber,
      password: passwordHash,
      wantsToVolunteer,
      preferredArea: wantsToVolunteer ? body.preferredArea : undefined,
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

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function frontendUrl() {
  // No FRONTEND_URL in .env at the moment: this is the one deployed frontend, so it's a safe
  // default rather than a config gap. Override locally if you ever need to test against dev.
  return process.env.FRONTEND_URL || "https://care-circle.nour-sabir.dev";
}

// Deliberately the same outcome whether or not the email belongs to an account: the caller
// (see auth.controller.ts) always returns a generic "check your email" response either way, so
// this can't be used to find out which emails are registered.
export async function requestPasswordReset(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // One live link per account: a new request invalidates any earlier one.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${frontendUrl()}/reset-password?token=${token}`;
  await sendEmail(
    user.email,
    "Reset your Care Circle password",
    `<p>Someone asked to reset the password on this Care Circle account.</p>` +
      `<p><a href="${resetUrl}">Set a new password</a></p>` +
      `<p>This link expires in 30 minutes. If this wasn't you, you can ignore this email. Your password hasn't changed.</p>`
  );
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.query.passwordResetTokens.findFirst({ where: eq(passwordResetTokens.tokenHash, tokenHash) });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "invalid_token", "This reset link is invalid or has expired");
  }

  const passwordHash = await password.hash(newPassword);
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, record.userId));
  // Delete every token for this user, not just the one used: a second unused link from an
  // earlier request shouldn't still work after the password has already changed.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record.userId));
}

export async function verifyPassword(userId: number, candidatePassword: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AppError(401, "invalid_credentials", "That password didn't match");

  const valid = await password.verify(candidatePassword, user.password);
  if (!valid) throw new AppError(401, "invalid_credentials", "That password didn't match");
}

export async function updateVolunteer(userId: number, body: z.infer<typeof updateVolunteerBodySchema>) {
  if (body.wantsToVolunteer && !body.preferredArea) {
    throw new AppError(400, "validation_error", "Add an area you're willing to help in");
  }

  if (!body.wantsToVolunteer) {
    // Turning volunteering off hides the "Volunteering" section (and its check-in/check-out
    // controls) from the dashboard entirely, so a visit the user is still on the hook for
    // would otherwise become invisible to them mid-commitment. Make them wrap it up first.
    const activeVisit = await db.query.visits.findFirst({
      where: and(eq(visits.visitorId, userId), inArray(visits.status, ["pending_family_confirm", "confirmed"])),
    });
    if (activeVisit) {
      throw new AppError(
        409,
        "active_visits",
        "Finish or cancel your active visit(s) before turning off volunteering"
      );
    }
  }

  const [user] = await db
    .update(users)
    .set({
      wantsToVolunteer: body.wantsToVolunteer,
      preferredArea: body.wantsToVolunteer ? body.preferredArea : null,
    })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw new AppError(404, "not_found", "User not found");

  return toPublicUser(user);
}
