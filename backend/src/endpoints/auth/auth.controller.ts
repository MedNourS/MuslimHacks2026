import { z } from "zod";
import { setCookie, deleteCookie } from "hono/cookie";
import { defineRoute, type BackonContext } from "@mednours/backon";
import { SESSION_COOKIE } from "../../middleware/cookie-auth.middleware";
import * as service from "./auth.services";

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

function normalizePhoneNumber(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

// 30 days, matching the JWT's own expiry (issueToken() in auth.services.ts) — the cookie
// shouldn't outlive the token it's carrying.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function setSessionCookie(c: BackonContext, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    // Vercel sets VERCEL=1 in every deployment (dev/preview/prod), all served over https.
    // Local `bun run dev` has no such var, so this stays false there — a `secure` cookie is
    // silently dropped by the browser over plain http and would break local login.
    secure: !!process.env.VERCEL,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export const signupBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phoneNumber: z
    .string()
    .min(7, "Enter a valid phone number")
    .transform((val) => normalizePhoneNumber(val))
    .refine((val) => PHONE_REGEX.test(val), "Enter a valid phone number, e.g. +15145550123"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Optional add-on, not exclusive with anything else — you can create/join your own
  // circle(s) AND volunteer for others at the same time.
  wantsToVolunteer: z.boolean().optional(),
  // Required when wantsToVolunteer is true — a coarse area they're willing to help in.
  preferredArea: z.string().min(1).optional(),
});
export const signup = defineRoute({ body: signupBodySchema }, async (c, { body }) => {
  const result = await service.signup(body);
  setSessionCookie(c, result.token);
  return c.json({ user: result.user }, 201);
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export const login = defineRoute({ body: loginBodySchema }, async (c, { body }) => {
  const result = await service.login(body);
  setSessionCookie(c, result.token);
  return c.json({ user: result.user });
});

export const logout = defineRoute({}, async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

export const forgotPasswordBodySchema = z.object({ email: z.string().email() });
export const forgotPassword = defineRoute({ body: forgotPasswordBodySchema }, async (c, { body }) => {
  await service.requestPasswordReset(body.email);
  // Same response whether or not the account exists — see requestPasswordReset().
  return c.json({ ok: true });
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Missing reset token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export const resetPassword = defineRoute({ body: resetPasswordBodySchema }, async (c, { body }) => {
  await service.resetPassword(body.token, body.password);
  return c.json({ ok: true });
});

export const updateVolunteerBodySchema = z.object({
  wantsToVolunteer: z.boolean(),
  // Required when turning volunteering on.
  preferredArea: z.string().min(1).optional(),
});
export const updateVolunteer = defineRoute({ body: updateVolunteerBodySchema }, async (c, { body }) => {
  const userId = Number(c.get("auth")?.sub);
  const user = await service.updateVolunteer(userId, body);
  return c.json({ user });
});
