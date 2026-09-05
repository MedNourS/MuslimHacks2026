import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../config/db";
import { visits, elders, careCircleMembers, users } from "../../config/schema";
import { sendEmail } from "../../config/email";

// The app's users are Eastern-time (Montreal); the cron itself runs on Vercel's UTC clock,
// so "today" has to be computed in the household's zone or evening visits (after ~8pm ET)
// land in tomorrow's UTC date and get reported a day late — after they already happened.
const DIGEST_TIME_ZONE = "America/Toronto";

function startOfDayInZone(date: Date, timeZone: string): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtcGuess = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
  const offsetMs = asUtcGuess - date.getTime();
  const localMidnightUtcGuess = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 0, 0, 0) - offsetMs;
  return new Date(localMidnightUtcGuess);
}

export async function runVisitDigest() {
  const now = new Date();
  const startOfDay = startOfDayInZone(now, DIGEST_TIME_ZONE);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const todaysVisits = await db
    .select({
      id: visits.id,
      elderId: visits.elderId,
      scheduledAt: visits.scheduledAt,
      notes: visits.notes,
      visitorName: users.name,
    })
    .from(visits)
    .innerJoin(users, eq(visits.visitorId, users.id))
    .where(and(gte(visits.scheduledAt, startOfDay), lt(visits.scheduledAt, endOfDay)));

  if (todaysVisits.length === 0) return { eldersNotified: 0, visits: 0 };

  const byElder = new Map<string, typeof todaysVisits>();
  for (const v of todaysVisits) {
    const list = byElder.get(v.elderId) ?? [];
    list.push(v);
    byElder.set(v.elderId, list);
  }

  let eldersNotified = 0;
  for (const [elderId, elderVisits] of byElder) {
    const elder = await db.query.elders.findFirst({ where: eq(elders.id, elderId) });
    if (!elder) continue;

    const members = await db
      .select({ email: users.email, name: users.name })
      .from(careCircleMembers)
      .innerJoin(users, eq(careCircleMembers.userId, users.id))
      .where(eq(careCircleMembers.elderId, elderId));

    const rows = elderVisits
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .map((v) => {
        const time = v.scheduledAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: DIGEST_TIME_ZONE,
        });
        return `<li><strong>${v.visitorName}</strong> around ${time}${v.notes ? ` — ${v.notes}` : ""}</li>`;
      })
      .join("");

    const html = `<p>Here's who's stopping by to see ${elder.fullName} today:</p><ul>${rows}</ul>`;

    await Promise.all(members.map((m) => sendEmail(m.email, `Today's visits for ${elder.fullName}`, html)));
    eldersNotified++;
  }

  return { eldersNotified, visits: todaysVisits.length };
}
