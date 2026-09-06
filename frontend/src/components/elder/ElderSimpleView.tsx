import { useEffect, useState } from "react";
import { visitsApi } from "../../lib/api";
import type { Visit } from "../../lib/visits";
import { formatVisitTime } from "../../lib/time";
import { TimelineFeed } from "../timeline/TimelineFeed";
import { MedicationSchedule } from "../medications/MedicationSchedule";
import { PrayerTimes } from "./PrayerTimes";

export interface ElderSimpleViewProps {
  elderId: string;
  fullName: string;
  area: string;
}

export function ElderSimpleView({ elderId, fullName, area }: ElderSimpleViewProps) {
  const [nextVisit, setNextVisit] = useState<Visit | null | undefined>(undefined);

  useEffect(() => {
    visitsApi
      .list<Visit[]>(elderId)
      .then((visits) => {
        const upcoming = visits
          .filter((v) => v.status === "confirmed" && new Date(v.scheduledAt).getTime() > Date.now())
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setNextVisit(upcoming[0] ?? null);
      })
      .catch(() => setNextVisit(null));
  }, [elderId]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-4xl font-extrabold text-ink-900">Hi, {fullName.split(" ")[0]}</h1>

      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-7">
        <p className="text-lg font-bold text-ink-900">Who's coming to see you</p>
        {nextVisit === undefined && <p className="mt-3 text-lg text-ink-500">Loading…</p>}
        {nextVisit === null && <p className="mt-3 text-lg text-ink-500">No visit set up yet.</p>}
        {nextVisit && (
          <div className="mt-3">
            <p className="text-2xl font-bold text-sage-700">{nextVisit.visitor?.name ?? "Someone"}</p>
            <p className="mt-1 text-lg text-ink-700">{formatVisitTime(nextVisit.scheduledAt)}</p>
          </div>
        )}
      </div>

      <MedicationSchedule elderId={elderId} large />

      <PrayerTimes area={area} />

      <TimelineFeed elderId={elderId} readOnly large />
    </main>
  );
}
