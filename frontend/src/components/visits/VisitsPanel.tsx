import { useEffect, useState, type FormEvent } from "react";
import { visitsApi } from "../../lib/api";
import type { Visit } from "../../lib/visits";
import { formatVisitTime } from "../../lib/time";
import { getSessionUser } from "../../lib/session";
import { Button } from "../shared/Button";

export interface VisitsPanelProps {
  elderId: string;
}

export function VisitsPanel({ elderId }: VisitsPanelProps) {
  const user = getSessionUser();
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    visitsApi
      .list<Visit[]>(elderId)
      .then(setVisits)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load visits."));
  }, [elderId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!scheduledAt) return;
    setError(null);
    setSubmitting(true);
    try {
      const visit = await visitsApi.create<Visit>(elderId, {
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || undefined,
      });
      setVisits((prev) => [...(prev ?? []), visit].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      setScheduledAt("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const now = Date.now();
  const upcoming = visits?.filter((v) => new Date(v.scheduledAt).getTime() >= now) ?? [];
  const past = visits?.filter((v) => new Date(v.scheduledAt).getTime() < now) ?? [];

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-sm font-bold text-ink-900">Visits</h2>
      <p className="mt-1 text-xs text-ink-500">
        Schedule a visit so everyone in the circle knows who's stopping by — a daily reminder goes out by email.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-lg border-1.5 border-black/10 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors focus:border-sage-500 focus:ring-3 focus:ring-sage-100"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional) — e.g. bringing groceries"
          maxLength={500}
          className="w-full rounded-lg border-1.5 border-black/10 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-sage-500 focus:ring-3 focus:ring-sage-100"
        />
        {error && <p className="text-xs font-medium text-danger-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" isLoading={submitting} disabled={!scheduledAt}>
            Schedule visit
          </Button>
        </div>
      </form>

      {loadError && <p className="mt-3 text-sm font-medium text-danger-600">{loadError}</p>}

      {visits && visits.length === 0 && <p className="mt-2 text-sm text-ink-500">No visits scheduled yet.</p>}

      {upcoming.length > 0 && (
        <div className="mt-5 border-t border-black/5 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Upcoming</p>
          <ul className="mt-3 space-y-3">
            {upcoming.map((visit) => (
              <li key={visit.id} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {visit.visitor.id === user?.id ? "You" : visit.visitor.name}
                  </p>
                  {visit.notes && <p className="text-xs text-ink-500">{visit.notes}</p>}
                </div>
                <p className="shrink-0 text-xs text-ink-500">{formatVisitTime(visit.scheduledAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-5 border-t border-black/5 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Past</p>
          <ul className="mt-3 space-y-3">
            {past.map((visit) => (
              <li key={visit.id} className="flex items-baseline justify-between gap-3 opacity-60">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {visit.visitor.id === user?.id ? "You" : visit.visitor.name}
                  </p>
                  {visit.notes && <p className="text-xs text-ink-500">{visit.notes}</p>}
                </div>
                <p className="shrink-0 text-xs text-ink-500">{formatVisitTime(visit.scheduledAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
