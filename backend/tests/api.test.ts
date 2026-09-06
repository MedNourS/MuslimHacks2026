// Integration tests for the live API surface. These run against the real database (whatever
// DATABASE_URL in .env points to) through the actual Hono app — no mocks, no test double for
// Drizzle. Every user/elder a test creates is tracked and deleted in afterAll(), so a full run
// leaves the database exactly as it found it. If you add a test that creates data, track the
// id and let the cleanup at the bottom delete it — don't leave rows behind (we've had to do a
// manual cleanup sweep of leftover test accounts before; this file is what replaces that).
import { describe, test, expect, afterAll } from "bun:test";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { elders, passwordResetTokens, users } from "../src/config/schema";

// Mirrors the private hashResetToken() in auth.services.ts (sha256 hex) — tests own this token
// directly since the API, correctly, never returns one.
function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const createdUserIds: number[] = [];
const createdElderIds: string[] = [];

function testEmail(tag: string) {
  return `test.${RUN_ID}.${tag}@carecircle.test`;
}

// +1 followed by 9 digits — satisfies the app's phone regex (a leading 1-9 digit, then 7-14
// more) while staying unique per test run and per call within a run.
function testPhone(n: number) {
  const suffix = RUN_ID.slice(-6).padStart(6, "0");
  return `+1${suffix}${String(n).padStart(3, "0")}`;
}

async function signup(n: number, overrides: Record<string, unknown> = {}) {
  const body = {
    name: `Test User ${n}`,
    email: testEmail(`u${n}`),
    phoneNumber: testPhone(n),
    password: "TestPass123!",
    ...overrides,
  };
  const res = await app.request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 201) {
    const { user } = (await res.clone().json()) as { user: { id: number } };
    createdUserIds.push(user.id);
  }
  return res;
}

function sessionCookie(res: Response) {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("Response had no set-cookie header");
  return raw.split(";")[0];
}

async function signedUpUser(n: number, overrides: Record<string, unknown> = {}) {
  const res = await signup(n, overrides);
  expect(res.status).toBe(201);
  const cookie = sessionCookie(res);
  const { user } = (await res.json()) as { user: { id: number } };
  return { cookie, userId: user.id };
}

async function createElder(cookie: string, n: number) {
  const res = await app.request("/elders", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ fullName: `Test Elder ${n}`, area: "Test Area" }),
  });
  expect(res.status).toBe(201);
  const elder = (await res.json()) as { id: string; inviteCode: string };
  createdElderIds.push(elder.id);
  return elder;
}

describe("Auth", () => {
  test("signup creates an account and sets a session cookie", async () => {
    const res = await signup(1);
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toContain("care_circle_session=");
    const { user } = (await res.json()) as { user: { email: string } };
    expect(user.email).toBe(testEmail("u1"));
  });

  test("signup rejects a duplicate email with 409 email_taken", async () => {
    const email = testEmail("dupe-email");
    const first = await signup(2, { email });
    expect(first.status).toBe(201);
    const second = await signup(3, { email });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe("email_taken");
  });

  test("signup rejects a duplicate phone number with 409 phone_taken", async () => {
    const phoneNumber = testPhone(900);
    const first = await signup(4, { phoneNumber });
    expect(first.status).toBe(201);
    const second = await signup(5, { phoneNumber });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe("phone_taken");
  });

  test("login succeeds with the right password and fails with the wrong one", async () => {
    const email = testEmail("login");
    const signedUp = await signup(6, { email, password: "CorrectHorse1!" });
    expect(signedUp.status).toBe(201);

    const ok = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "CorrectHorse1!" }),
    });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toContain("care_circle_session=");

    const bad = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "WrongPassword1!" }),
    });
    expect(bad.status).toBe(401);
    const body = (await bad.json()) as { error: { code: string } };
    expect(body.error.code).toBe("invalid_credentials");
  });

  test("verify-password confirms the right password, rejects the wrong one, and requires auth", async () => {
    const account = await signedUpUser(60, { password: "GateKeeper1!" });

    const anonymous = await app.request("/auth/verify-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "GateKeeper1!" }),
    });
    expect(anonymous.status).toBe(401);

    const wrong = await app.request("/auth/verify-password", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: account.cookie },
      body: JSON.stringify({ password: "NotIt1!" }),
    });
    expect(wrong.status).toBe(401);
    const wrongBody = (await wrong.json()) as { error: { code: string } };
    expect(wrongBody.error.code).toBe("invalid_credentials");

    const right = await app.request("/auth/verify-password", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: account.cookie },
      body: JSON.stringify({ password: "GateKeeper1!" }),
    });
    expect(right.status).toBe(200);
    const rightBody = (await right.json()) as { ok: boolean };
    expect(rightBody.ok).toBe(true);
  });
});

describe("Elders & circles", () => {
  test("creating an elder returns a usable invite code, and a second user can join with it", async () => {
    const family = await signedUpUser(7);
    const elder = await createElder(family.cookie, 1);
    expect(elder.inviteCode).toMatch(/^[A-Z0-9]{6}$/);

    const neighbor = await signedUpUser(8);
    const join = await app.request("/elders/join", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: neighbor.cookie },
      body: JSON.stringify({ inviteCode: elder.inviteCode }),
    });
    expect(join.status).toBe(200);

    const list = await app.request("/elders", { headers: { cookie: neighbor.cookie } });
    const circles = (await list.json()) as Array<{ id: string }>;
    expect(circles.some((c) => c.id === elder.id)).toBe(true);
  });
});

describe("Medication schedule", () => {
  test("a member can add, list (sorted by time), and remove a schedule entry; a non-member can't touch it", async () => {
    const family = await signedUpUser(50);
    const elder = await createElder(family.cookie, 30);

    const evening = await app.request(`/medications/${elder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ label: "Evening blood pressure pill", timeOfDay: "19:30" }),
    });
    expect(evening.status).toBe(201);

    const morning = await app.request(`/medications/${elder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ label: "Morning insulin", timeOfDay: "08:00" }),
    });
    expect(morning.status).toBe(201);
    const morningRow = (await morning.json()) as { id: string };

    const rejected = await app.request(`/medications/${elder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ label: "Bad time", timeOfDay: "25:99" }),
    });
    expect(rejected.status).toBe(400);

    const listed = await app.request(`/medications/${elder.id}`, { headers: { cookie: family.cookie } });
    expect(listed.status).toBe(200);
    const rows = (await listed.json()) as Array<{ label: string; timeOfDay: string }>;
    expect(rows.map((r) => r.timeOfDay)).toEqual(["08:00", "19:30"]);

    const outsider = await signedUpUser(51);
    const blockedList = await app.request(`/medications/${elder.id}`, { headers: { cookie: outsider.cookie } });
    expect(blockedList.status).toBe(404);

    const blockedDelete = await app.request(`/medications/${morningRow.id}`, {
      method: "DELETE",
      headers: { cookie: outsider.cookie },
    });
    expect(blockedDelete.status).toBe(404);

    const removed = await app.request(`/medications/${morningRow.id}`, {
      method: "DELETE",
      headers: { cookie: family.cookie },
    });
    expect(removed.status).toBe(200);

    const afterRemoval = await app.request(`/medications/${elder.id}`, { headers: { cookie: family.cookie } });
    const remaining = (await afterRemoval.json()) as Array<{ label: string }>;
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.label).toBe("Evening blood pressure pill");
  });
});

describe("Password reset", () => {
  test("requesting a reset creates one pending token for a real account, and re-requesting replaces it", async () => {
    const account = await signedUpUser(40);

    const first = await app.request("/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail("u40") }),
    });
    expect(first.status).toBe(200);

    const afterFirst = await db.query.passwordResetTokens.findMany({ where: eq(passwordResetTokens.userId, account.userId) });
    expect(afterFirst.length).toBe(1);

    const second = await app.request("/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail("u40") }),
    });
    expect(second.status).toBe(200);

    const afterSecond = await db.query.passwordResetTokens.findMany({ where: eq(passwordResetTokens.userId, account.userId) });
    expect(afterSecond.length).toBe(1);
    expect(afterSecond[0]!.tokenHash).not.toBe(afterFirst[0]!.tokenHash);
  });

  test("requesting a reset for an unknown email is a no-op, not an error", async () => {
    const res = await app.request("/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail("does-not-exist") }),
    });
    // Same response either way — the point is a caller can't tell registered emails from
    // unregistered ones by watching for a different status code.
    expect(res.status).toBe(200);
  });

  test("a valid token resets the password, then can't be reused", async () => {
    const account = await signedUpUser(41, { password: "OldPassword1!" });
    const rawToken = "test-reset-token-" + RUN_ID;
    await db.insert(passwordResetTokens).values({
      userId: account.userId,
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const reset = await app.request("/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: rawToken, password: "NewPassword1!" }),
    });
    expect(reset.status).toBe(200);

    const loginOld = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail("u41"), password: "OldPassword1!" }),
    });
    expect(loginOld.status).toBe(401);

    const loginNew = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail("u41"), password: "NewPassword1!" }),
    });
    expect(loginNew.status).toBe(200);

    // The token was single-use — trying it again should fail now that it's been consumed.
    const reused = await app.request("/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: rawToken, password: "AnotherPassword1!" }),
    });
    expect(reused.status).toBe(400);
  });

  test("an unknown or expired token is rejected", async () => {
    const garbage = await app.request("/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "not-a-real-token", password: "WhateverPass1!" }),
    });
    expect(garbage.status).toBe(400);
    expect(((await garbage.json()) as { error: { code: string } }).error.code).toBe("invalid_token");

    const account = await signedUpUser(42);
    const rawToken = "expired-token-" + RUN_ID;
    await db.insert(passwordResetTokens).values({
      userId: account.userId,
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() - 1000), // already expired
    });

    const expired = await app.request("/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: rawToken, password: "WhateverPass1!" }),
    });
    expect(expired.status).toBe(400);
  });
});

describe("Timeline", () => {
  test("the author can edit their own entry; another member can't", async () => {
    const family = await signedUpUser(30);
    const elder = await createElder(family.cookie, 20);

    const posted = await app.request(`/timeline/${elder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ body: "Original note" }),
    });
    expect(posted.status).toBe(201);
    const post = (await posted.json()) as { id: string };

    const edited = await app.request(`/timeline/post/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ body: "Corrected note" }),
    });
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as { body: string }).body).toBe("Corrected note");

    const outsider = await signedUpUser(31);
    const join = await app.request("/elders/join", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: outsider.cookie },
      body: JSON.stringify({ inviteCode: elder.inviteCode }),
    });
    expect(join.status).toBe(200);

    const blocked = await app.request(`/timeline/post/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: outsider.cookie },
      body: JSON.stringify({ body: "Not mine to change" }),
    });
    expect(blocked.status).toBe(403);
  });
});

describe("Open postings — area matching", () => {
  test("a posting in the volunteer's own area is flagged and sorted first", async () => {
    const nearFamily = await signedUpUser(20);
    const nearElder = await createElder(nearFamily.cookie, 10);
    const farFamily = await signedUpUser(21);
    const farElder = await createElder(farFamily.cookie, 11);
    // createElder always uses area "Test Area" — give the far one a distinct area so only
    // one of the two postings should match the volunteer's preferred area below.
    await db.update(elders).set({ area: "Somewhere Else" }).where(eq(elders.id, farElder.id));

    const volunteer = await signedUpUser(22, { wantsToVolunteer: true, preferredArea: "Test Area" });

    await app.request(`/visits/${farElder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: farFamily.cookie },
      body: JSON.stringify({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }),
    });
    await app.request(`/visits/${nearElder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: nearFamily.cookie },
      body: JSON.stringify({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }),
    });

    const res = await app.request("/visits/open", { headers: { cookie: volunteer.cookie } });
    expect(res.status).toBe(200);
    const postings = (await res.json()) as Array<{ elderId: string; matchesArea: boolean }>;

    const near = postings.find((p) => p.elderId === nearElder.id);
    const far = postings.find((p) => p.elderId === farElder.id);
    expect(near?.matchesArea).toBe(true);
    expect(far?.matchesArea).toBe(false);
    expect(postings.indexOf(near!)).toBeLessThan(postings.indexOf(far!));
  });
});

describe("Visit lifecycle", () => {
  test("open -> claim -> confirm -> check-in -> check-out completes the visit", async () => {
    const family = await signedUpUser(9);
    const elder = await createElder(family.cookie, 2);
    const volunteer = await signedUpUser(10, { wantsToVolunteer: true, preferredArea: "Test Area" });

    const posted = await app.request(`/visits/${elder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }),
    });
    expect(posted.status).toBe(201);
    const visit = (await posted.json()) as { id: string; status: string };
    expect(visit.status).toBe("open");

    const claimed = await app.request(`/visits/${visit.id}/claim`, {
      method: "POST",
      headers: { cookie: volunteer.cookie },
    });
    expect(claimed.status).toBe(200);
    expect(((await claimed.json()) as { status: string }).status).toBe("pending_family_confirm");

    const confirmed = await app.request(`/visits/${visit.id}/confirm`, {
      method: "POST",
      headers: { cookie: family.cookie },
    });
    expect(confirmed.status).toBe(200);
    expect(((await confirmed.json()) as { status: string }).status).toBe("confirmed");

    const checkedIn = await app.request(`/visits/${visit.id}/check-in`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: volunteer.cookie },
      body: JSON.stringify({ lat: "45.5", lng: "-73.6" }),
    });
    expect(checkedIn.status).toBe(200);

    const checkedOut = await app.request(`/visits/${visit.id}/check-out`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: volunteer.cookie },
      body: JSON.stringify({ lat: "45.5", lng: "-73.6" }),
    });
    expect(checkedOut.status).toBe(200);
    expect(((await checkedOut.json()) as { status: string }).status).toBe("completed");
  });

  test("a volunteer can't turn off volunteering while a visit is still pending or confirmed", async () => {
    const family = await signedUpUser(11);
    const elder = await createElder(family.cookie, 3);
    const volunteer = await signedUpUser(12, { wantsToVolunteer: true, preferredArea: "Test Area" });

    const posted = await app.request(`/visits/${elder.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: family.cookie },
      body: JSON.stringify({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }),
    });
    const visit = (await posted.json()) as { id: string };

    const claimed = await app.request(`/visits/${visit.id}/claim`, {
      method: "POST",
      headers: { cookie: volunteer.cookie },
    });
    expect(claimed.status).toBe(200);

    // Still pending_family_confirm — turning volunteering off should be blocked.
    const blocked = await app.request("/auth/volunteer", {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: volunteer.cookie },
      body: JSON.stringify({ wantsToVolunteer: false }),
    });
    expect(blocked.status).toBe(409);
    const blockedBody = (await blocked.json()) as { error: { code: string } };
    expect(blockedBody.error.code).toBe("active_visits");

    // Cancel the visit, then the same toggle should succeed.
    const cancelled = await app.request(`/visits/${visit.id}/cancel`, {
      method: "POST",
      headers: { cookie: volunteer.cookie },
    });
    expect(cancelled.status).toBe(200);

    const allowed = await app.request("/auth/volunteer", {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: volunteer.cookie },
      body: JSON.stringify({ wantsToVolunteer: false }),
    });
    expect(allowed.status).toBe(200);
  });
});

afterAll(async () => {
  if (createdElderIds.length) {
    // Cascades away that elder's care_circle_members, timeline_posts, and visits rows too.
    await db.delete(elders).where(inArray(elders.id, createdElderIds));
  }
  if (createdUserIds.length) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});
