import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../config/db";
import { visits, elders, careCircleMembers, users } from "../../config/schema";
import { sendEmail } from "../../config/email";

export async function runVisitDigest() {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
          timeZone: "UTC",
        });
        return `<li><strong>${v.visitorName}</strong> around ${time} UTC${v.notes ? ` — ${v.notes}` : ""}</li>`;
      })
      .join("");

    const html = `<p>Here's who's stopping by to see ${elder.fullName} today:</p><ul>${rows}</ul>`;

    await Promise.all(members.map((m) => sendEmail(m.email, `Today's visits for ${elder.fullName}`, html)));
    eldersNotified++;
  }

  return { eldersNotified, visits: todaysVisits.length };
}
