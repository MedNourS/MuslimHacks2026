import { useEffect, useState, type FormEvent } from "react";
import { visitsApi } from "../../lib/api";
import { getCurrentPosition } from "../../lib/geo";
import type { CircleRole } from "../../lib/circles";
import type { Visit } from "../../lib/visits";
import { formatVisitTime } from "../../lib/time";
import { Button } from "../shared/Button";
import { Field } from "../shared/Field";

export interface VisitsPanelProps {
  elderId: string;
  role: CircleRole;
  currentUserId: number;
}

const STATUS_LABEL: Record<Visit["status"], string> = {
  open: "Waiting for a volunteer",
  pending_family_confirm: "Volunteer offered — needs your confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function VisitsPanel({ elderId, role, currentUserId }: VisitsPanelProps) {
  const isCoordinator = role === "family" || role === "elder";
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    visitsApi
      .list<Visit[]>(elderId)
      .then(setVisits)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load visits."));
  }

  useEffect(refresh, [elderId]);

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
      setVisits((prev) => [visit, ...(prev ?? [])]);
      setScheduledAt("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(id: string, action: () => Promise<Visit>) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await action();
      setVisits((prev) => prev?.map((v) => (v.id === id ? updated : v)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  const active = visits?.filter((v) => v.status !== "cancelled" && v.status !== "completed") ?? [];
  const past = visits?.filter((v) => v.status === "cancelled" || v.status === "completed") ?? [];

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-sm font-bold text-ink-900">Visits</h2>

      {isCoordinator && (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Requested time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            <Field
              label="Notes (optional)"
              type="text"
              placeholder="Company for the afternoon, a grocery run…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
          {error && <p className="mt-1.5 text-xs font-medium text-danger-600">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={!scheduledAt}>
              Post a request
            </Button>
          </div>
        </form>
      )}

      {!isCoordinator && error && <p className="mt-3 text-sm font-medium text-danger-600">{error}</p>}
      {loadError && <p className="mt-3 text-sm font-medium text-danger-600">{loadError}</p>}

      {visits && active.length === 0 && (
        <p className="mt-3 text-sm text-ink-500">
          {isCoordinator ? "No active requests — post one above." : "No visits assigned to you here yet."}
        </p>
      )}

      {active.length > 0 && (
        <ul className="mt-5 space-y-3 border-t border-black/5 pt-5">
          {active.map((visit) => {
            const isMyConfirmedVisit = visit.status === "confirmed" && visit.visitor?.id === currentUserId;
            return (
              <li key={visit.id} className="rounded-xl bg-sand-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{formatVisitTime(visit.scheduledAt)}</p>
                    {visit.notes && <p className="mt-0.5 text-sm text-ink-700">{visit.notes}</p>}
                    {visit.visitor && <p className="mt-1 text-xs text-ink-500">Volunteer: {visit.visitor.name}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sage-700">
                    {STATUS_LABEL[visit.status]}
                  </span>
                </div>

                {isCoordinator && visit.status === "pending_family_confirm" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="default" isLoading={busyId === visit.id} onClick={() => runAction(visit.id, () => visitsApi.confirm(visit.id))}>
                      Confirm
                    </Button>
                    <Button
                      variant="secondary"
                      isLoading={busyId === visit.id}
                      onClick={() => runAction(visit.id, () => visitsApi.decline(visit.id))}
                    >
                      Decline
                    </Button>
                  </div>
                )}

                {isCoordinator && (visit.status === "open" || visit.status === "confirmed") && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="default"
                      isLoading={busyId === visit.id}
                      onClick={() => runAction(visit.id, () => visitsApi.cancel(visit.id))}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {isMyConfirmedVisit && (
                  <div className="mt-3 flex items-center gap-2">
                    {!visit.checkInAt && (
                      <Button
                        isLoading={busyId === visit.id}
                        onClick={() =>
                          runAction(visit.id, async () => {
                            const position = await getCurrentPosition();
                            return visitsApi.checkIn<Visit>(visit.id, position);
                          })
                        }
                      >
                        Check in
                      </Button>
                    )}
                    {visit.checkInAt && !visit.checkOutAt && (
                      <Button
                        variant="secondary"
                        isLoading={busyId === visit.id}
                        onClick={() =>
                          runAction(visit.id, async () => {
                            const position = await getCurrentPosition();
                            return visitsApi.checkOut<Visit>(visit.id, position);
                          })
                        }
                      >
                        Check out
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {past.length > 0 && (
        <div className="mt-5 border-t border-black/5 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">History</p>
          <ul className="mt-2 space-y-1.5">
            {past.map((visit) => (
              <li key={visit.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{formatVisitTime(visit.scheduledAt)}</span>
                <span className="text-ink-500">{STATUS_LABEL[visit.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
