import { z } from "zod";
import { defineRoute } from "@mednours/backon";
import * as service from "./auth.services";

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

function normalizePhoneNumber(raw: string) {
  return raw.replace(/[^\d+]/g, "");
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
});
export const signup = defineRoute({ body: signupBodySchema }, async (c, { body }) => {
  const result = await service.signup(body);
  return c.json(result, 201);
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export const login = defineRoute({ body: loginBodySchema }, async (c, { body }) => {
  const result = await service.login(body);
  return c.json(result);
});
