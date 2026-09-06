import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../config/db";
import { visits, elders, careCircleMembers, users } from "../../config/schema";
import { sendEmail } from "../../config/email";

// The app's users are Eastern-time (Montreal); the cron itself runs on Vercel's UTC clock,
// so "today" has to be computed in the household's zone or evening visits (after ~8pm ET)
// land in tomorrow's UTC date and get reported a day late, after they already happened.
const DIGEST_TIME_ZONE = "America/Toronto";

function zonedOffsetMs(utcMs: number, timeZone: string): number {
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
  const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
  return asUtc - utcMs;
}

function startOfDayInZone(date: Date, timeZone: string): Date {
  const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(dateFmt.formatToParts(date).map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month) - 1;
  const d = Number(parts.day);

  // First guess using the offset in effect at `date` itself (the cron's run time).
  const offsetMs = zonedOffsetMs(date.getTime(), timeZone);
  let guessUtcMs = Date.UTC(y, m, d, 0, 0, 0) - offsetMs;

  // Refine using the offset actually in effect at the guessed midnight. This only matters on
  // the two DST-transition days a year, where "now"'s offset (the cron runs at 9am ET) doesn't
  // match the offset that was actually in effect at local midnight that morning -- without this,
  // the digest window shifts an hour and can sweep in a visit from the night before.
  const refinedOffsetMs = zonedOffsetMs(guessUtcMs, timeZone);
  if (refinedOffsetMs !== offsetMs) {
    guessUtcMs = Date.UTC(y, m, d, 0, 0, 0) - refinedOffsetMs;
  }
  return new Date(guessUtcMs);
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
    .where(
      and(gte(visits.scheduledAt, startOfDay), lt(visits.scheduledAt, endOfDay), eq(visits.status, "confirmed"))
    );

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
        return `<li><strong>${v.visitorName}</strong> around ${time}${v.notes ? `: ${v.notes}` : ""}</li>`;
      })
      .join("");

    const html = `<p>Here's who's stopping by to see ${elder.fullName} today:</p><ul>${rows}</ul>`;

    await Promise.all(members.map((m) => sendEmail(m.email, `Today's visits for ${elder.fullName}`, html)));
    eldersNotified++;
  }

  return { eldersNotified, visits: todaysVisits.length };
}
