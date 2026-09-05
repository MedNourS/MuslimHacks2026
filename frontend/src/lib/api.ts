// Synced from the backon backend by `bunx create-fronton sync-api` — do not edit.
// Re-run that after changing routes in the backend. Committed rather than
// gitignored on purpose: a deploy builds this project on its own, with no
// backend checkout next to it to regenerate from.

import { resolveApiBaseUrl } from "@mednours/fronton/client";
import { getToken } from "./session";

import type { z } from "zod";
import type { createBodySchema, updateBodySchema } from "../../../backend/src/endpoints/users/users.controller";
import type { signupBodySchema, loginBodySchema } from "../../../backend/src/endpoints/auth/auth.controller";
import type { createBodySchema as eldersCreateBodySchema, joinBodySchema } from "../../../backend/src/endpoints/elders/elders.controller";

const BASE_URL = resolveApiBaseUrl() || (import.meta.env.DEV ? "/api" : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(init && init.headers ? init.headers : {}),
    },
  });
  if (!res.ok) {
    const errBody: any = await res.json().catch(() => undefined);
    throw new Error((errBody && errBody.error && errBody.error.message) || ("Request to " + path + " failed with " + res.status));
  }
  return res.json() as Promise<T>;
}

export const usersApi = {
  list: <T = unknown>() => request<T>("/users"),
  create: <T = unknown>(body: z.infer<typeof createBodySchema>) => request<T>("/users", { method: "POST", body: JSON.stringify(body) }),
  getById: <T = unknown>(id: string) => request<T>("/users/" + id),
  update: <T = unknown>(id: string, body: z.infer<typeof updateBodySchema>) => request<T>("/users/" + id, { method: "PUT", body: JSON.stringify(body) }),
  remove: <T = unknown>(id: string) => request<T>("/users/" + id, { method: "DELETE" }),
};

export const authApi = {
  signup: <T = unknown>(body: z.infer<typeof signupBodySchema>) => request<T>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: <T = unknown>(body: z.infer<typeof loginBodySchema>) => request<T>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
};

export const eldersApi = {
  create: <T = unknown>(body: z.infer<typeof eldersCreateBodySchema>) => request<T>("/elders", { method: "POST", body: JSON.stringify(body) }),
  join: <T = unknown>(body: z.infer<typeof joinBodySchema>) => request<T>("/elders/join", { method: "POST", body: JSON.stringify(body) }),
  list: <T = unknown>() => request<T>("/elders"),
  getById: <T = unknown>(params: { id: string }) => request<T>("/elders/" + params.id),
};
