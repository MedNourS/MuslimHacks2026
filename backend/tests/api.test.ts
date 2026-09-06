// Integration tests for the live API surface. These run against the real database (whatever
// DATABASE_URL in .env points to) through the actual Hono app — no mocks, no test double for
// Drizzle. Every user/elder a test creates is tracked and deleted in afterAll(), so a full run
// leaves the database exactly as it found it. If you add a test that creates data, track the
// id and let the cleanup at the bottom delete it — don't leave rows behind (we've had to do a
// manual cleanup sweep of leftover test accounts before; this file is what replaces that).
import { describe, test, expect, afterAll } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { elders, users } from "../src/config/schema";

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
