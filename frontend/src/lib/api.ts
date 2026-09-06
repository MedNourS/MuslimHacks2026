// Synced from the backon backend by `bunx create-fronton sync-api` — do not edit.
// Re-run that after changing routes in the backend. Committed rather than
// gitignored on purpose: a deploy builds this project on its own, with no
// backend checkout next to it to regenerate from.

import { resolveApiBaseUrl } from "@mednours/fronton/client";

import type { z } from "zod";
import type { signupBodySchema, loginBodySchema, updateVolunteerBodySchema } from "../../../backend/src/endpoints/auth/auth.controller";
import type { createBodySchema as eldersCreateBodySchema, joinBodySchema } from "../../../backend/src/endpoints/elders/elders.controller";
import type { createBodySchema as timelineCreateBodySchema } from "../../../backend/src/endpoints/timeline/timeline.controller";
import type { createBodySchema as visitsCreateBodySchema, geoBodySchema as visitsGeoBodySchema } from "../../../backend/src/endpoints/visits/visits.controller";

const BASE_URL = resolveApiBaseUrl() || (import.meta.env.DEV ? "/api" : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init && init.headers ? init.headers : {}) },
  });
  if (!res.ok) {
    const errBody: any = await res.json().catch(() => undefined);
    throw new Error((errBody && errBody.error && errBody.error.message) || ("Request to " + path + " failed with " + res.status));
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  signup: <T = unknown>(body: z.infer<typeof signupBodySchema>) => request<T>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: <T = unknown>(body: z.infer<typeof loginBodySchema>) => request<T>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: <T = unknown>() => request<T>("/auth/logout", { method: "POST" }),
  updateVolunteer: <T = unknown>(body: z.infer<typeof updateVolunteerBodySchema>) =>
    request<T>("/auth/volunteer", { method: "PATCH", body: JSON.stringify(body) }),
};

export const eldersApi = {
  create: <T = unknown>(body: z.infer<typeof eldersCreateBodySchema>) => request<T>("/elders", { method: "POST", body: JSON.stringify(body) }),
  join: <T = unknown>(body: z.infer<typeof joinBodySchema>) => request<T>("/elders/join", { method: "POST", body: JSON.stringify(body) }),
  list: <T = unknown>() => request<T>("/elders"),
  getById: <T = unknown>(id: string) => request<T>("/elders/" + id),
};

export const timelineApi = {
  create: <T = unknown>(elderId: string, body: z.infer<typeof timelineCreateBodySchema>) => request<T>("/timeline/" + elderId, { method: "POST", body: JSON.stringify(body) }),
  list: <T = unknown>(elderId: string) => request<T>("/timeline/" + elderId),
};

export const visitsApi = {
  listOpen: <T = unknown>() => request<T>("/visits/open"),
  listMine: <T = unknown>() => request<T>("/visits/mine"),
  create: <T = unknown>(elderId: string, body: z.infer<typeof visitsCreateBodySchema>) => request<T>("/visits/" + elderId, { method: "POST", body: JSON.stringify(body) }),
  list: <T = unknown>(elderId: string) => request<T>("/visits/" + elderId),
  claim: <T = unknown>(visitId: string) => request<T>("/visits/" + visitId + "/claim", { method: "POST" }),
  confirm: <T = unknown>(visitId: string) => request<T>("/visits/" + visitId + "/confirm", { method: "POST" }),
  decline: <T = unknown>(visitId: string) => request<T>("/visits/" + visitId + "/decline", { method: "POST" }),
  cancel: <T = unknown>(visitId: string) => request<T>("/visits/" + visitId + "/cancel", { method: "POST" }),
  checkIn: <T = unknown>(visitId: string, body: z.infer<typeof visitsGeoBodySchema>) =>
    request<T>("/visits/" + visitId + "/check-in", { method: "POST", body: JSON.stringify(body) }),
  checkOut: <T = unknown>(visitId: string, body: z.infer<typeof visitsGeoBodySchema>) =>
    request<T>("/visits/" + visitId + "/check-out", { method: "POST", body: JSON.stringify(body) }),
};

export const cronApi = {
  visitDigest: <T = unknown>() => request<T>("/cron/visit-digest"),
};
