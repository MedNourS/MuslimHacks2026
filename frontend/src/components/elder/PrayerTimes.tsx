import { useEffect, useState } from "react";
import { formatTimeOfDay, minutesUntilTimeOfDay, formatMinutesCountdown } from "../../lib/time";

export interface PrayerTimesProps {
  area: string;
}

interface PrayerTime {
  name: string;
  timeOfDay: string; // 24-hour "HH:MM"
}

// Fard prayers only: Sunrise/Imsak/Midnight aren't things an elder needs a countdown to.
const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

// Aladhan sometimes returns times like "05:42 (EST)", keep just the "HH:MM" part.
function cleanTime(raw: string): string {
  return raw.split(" ")[0];
}

// Client-side only: calls the free Aladhan API directly from the browser using the elder's
// existing free-text `area` field, so this needs no backend route, API key, or DB column.
export function PrayerTimes({ area }: PrayerTimesProps) {
  const [times, setTimes] = useState<PrayerTime[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    setTimes(null);
    setFailed(false);
    fetch("https://api.aladhan.com/v1/timingsByAddress?address=" + encodeURIComponent(area) + "&method=2")
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const timings = data?.data?.timings;
        if (!timings) throw new Error("no timings");
        setTimes(PRAYER_ORDER.map((name) => ({ name, timeOfDay: cleanTime(timings[name]) })));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [area]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Quietly skip the widget if the area can't be geocoded, this is a nice-to-have, not
  // something that should ever block or clutter the elder's page with an error.
  if (failed) return null;

  const withCountdown = (times ?? []).map((t) => ({ ...t, minutesUntil: minutesUntilTimeOfDay(t.timeOfDay, now) }));
  const next = withCountdown.length > 0 ? withCountdown.reduce((a, b) => (a.minutesUntil <= b.minutesUntil ? a : b)) : null;

  return (
    <div className="mt-6 rounded-3xl border border-black/10 bg-white p-7">
      <h2 className="text-lg font-bold text-ink-900">Prayer times</h2>

      {!times && <p className="mt-3 text-lg text-ink-500">Loading…</p>}

      {next && (
        <div className="mt-3">
          <p className="text-2xl font-bold text-sage-700">{next.name}</p>
          <p className="mt-1 text-lg text-ink-700">
            {formatTimeOfDay(next.timeOfDay)} · in {formatMinutesCountdown(next.minutesUntil)}
          </p>
        </div>
      )}

      {withCountdown.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-black/5 pt-6">
          {withCountdown.map((t) => (
            <li key={t.name} className="flex items-baseline gap-1.5 text-sm">
              <span className="font-semibold text-ink-900">{t.name}</span>
              <span className="text-ink-500">{formatTimeOfDay(t.timeOfDay)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
