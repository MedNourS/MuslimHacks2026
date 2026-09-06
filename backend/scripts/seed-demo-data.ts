import { eq } from "drizzle-orm";
import { db } from "#config/db";
import { elders, users, careCircleMembers, visits } from "#config/schema";
import * as authService from "../src/endpoints/auth/auth.services";
import * as eldersService from "../src/endpoints/elders/elders.services";
import * as visitsService from "../src/endpoints/visits/visits.services";

const PASSWORD = "Demo1234!";

const DEMO_USERS = [
  { name: "John Doe", email: "john.doe@example.com", phoneNumber: "+15145550101", accountType: "family" as const },
  { name: "Jane Doe", email: "jane.doe@example.com", phoneNumber: "+15145550102", accountType: "family" as const },
  { name: "Bob Ross", email: "bob.ross@example.com", phoneNumber: "+15145550103", accountType: "family" as const },
  { name: "Alice Smith", email: "alice.smith@example.com", phoneNumber: "+15145550104", accountType: "family" as const },
  {
    name: "Yusuf Volunteer",
    email: "yusuf.volunteer@example.com",
    phoneNumber: "+15145550105",
    accountType: "volunteer" as const,
    preferredArea: "Verdun, Montreal",
  },
] as const;

async function ensureUser(u: (typeof DEMO_USERS)[number]) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, u.email) });
  if (existing) return existing;
  const { user } = await authService.signup({ ...u, password: PASSWORD });
  return user;
}

const [john, jane, bob, alice, yusuf] = await Promise.all(DEMO_USERS.map(ensureUser));

let robert = await db.query.elders.findFirst({ where: eq(elders.fullName, "Robert Doe") });
if (!robert) {
  robert = await eldersService.create(john.id, { fullName: "Robert Doe", area: "LaSalle, Montreal" });
  await eldersService.join(jane.id, { inviteCode: robert.inviteCode });
  await eldersService.join(bob.id, { inviteCode: robert.inviteCode });
  await db.update(careCircleMembers).set({ role: "other" }).where(eq(careCircleMembers.userId, bob.id));
}

let margaret = await db.query.elders.findFirst({ where: eq(elders.fullName, "Margaret Smith") });
if (!margaret) {
  margaret = await eldersService.create(alice.id, { fullName: "Margaret Smith", area: "Verdun, Montreal" });
}

// An open posting on Margaret's circle so the volunteer browse/claim flow has something to test
// against right away.
const existingOpenPosting = await db.query.visits.findFirst({
  where: eq(visits.elderId, margaret.id),
});
if (!existingOpenPosting) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await visitsService.create(alice.id, margaret.id, {
    scheduledAt: tomorrow.toISOString(),
    notes: "Could use company for a Friday afternoon visit and a grocery run.",
  });
}

console.log(
  JSON.stringify(
    {
      password: PASSWORD,
      users: { john, jane, bob, alice, yusuf },
      circles: { robert, margaret },
    },
    null,
    2
  )
);
