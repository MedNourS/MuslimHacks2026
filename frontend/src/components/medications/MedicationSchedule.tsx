import { useEffect, useState, type FormEvent } from "react";
import { medicationsApi } from "../../lib/api";
import type { MedicationSchedule as MedicationScheduleType } from "../../lib/medications";
import { formatTimeOfDay, minutesUntilTimeOfDay, formatMinutesCountdown } from "../../lib/time";
import { Button } from "../shared/Button";
import { Field } from "../shared/Field";

export interface MedicationScheduleProps {
  elderId: string;
  editable?: boolean;
  large?: boolean;
}

export function MedicationSchedule({ elderId, editable, large }: MedicationScheduleProps) {
  const [schedules, setSchedules] = useState<MedicationScheduleType[] | null>(null);
  const [label, setLabel] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    medicationsApi
      .list<MedicationScheduleType[]>(elderId)
      .then(setSchedules)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load the medicine schedule."));
  }, [elderId]);

  // Recompute the "next up" countdown every 30s so it stays live without a full refetch.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !timeOfDay) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await medicationsApi.create<MedicationScheduleType>(elderId, { label: label.trim(), timeOfDay });
      setSchedules((prev) => [...(prev ?? []), created].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay)));
      setLabel("");
      setTimeOfDay("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await medicationsApi.remove(id);
      setSchedules((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that.");
    } finally {
      setBusyId(null);
    }
  }

  const withCountdown = (schedules ?? [])
    .map((s) => ({ ...s, minutesUntil: minutesUntilTimeOfDay(s.timeOfDay, now) }))
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
  const next = withCountdown[0];
  const dueSoon = Boolean(next && next.minutesUntil <= 30);

  return (
    <div className={large ? "mt-6 rounded-3xl border border-black/10 bg-white p-7" : "rounded-2xl border border-black/10 bg-white p-6"}>
      <h2 className={large ? "text-lg font-bold text-ink-900" : "text-sm font-bold text-ink-900"}>Medicine</h2>

      {schedules === null && !loadError && (
        <p className={large ? "mt-3 text-lg text-ink-500" : "mt-2 text-sm text-ink-500"}>Loading…</p>
      )}
      {loadError && <p className="mt-3 text-sm font-medium text-danger-600">{loadError}</p>}
      {schedules && schedules.length === 0 && (
        <p className={large ? "mt-3 text-lg text-ink-500" : "mt-2 text-sm text-ink-500"}>Nothing scheduled yet.</p>
      )}

      {next && large && (
        <div className="mt-3">
          <p className={dueSoon ? "text-2xl font-bold text-danger-600" : "text-2xl font-bold text-sage-700"}>{next.label}</p>
          <p className="mt-1 text-lg text-ink-700">
            {formatTimeOfDay(next.timeOfDay)} — in {formatMinutesCountdown(next.minutesUntil)}
          </p>
        </div>
      )}

      {withCountdown.length > 0 && (
        <ul className={large ? "mt-6 space-y-3 border-t border-black/5 pt-6" : "mt-4 space-y-2.5"}>
          {withCountdown.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3">
              <div>
                <p className={large ? "text-base font-semibold text-ink-900" : "text-sm font-semibold text-ink-900"}>{s.label}</p>
                <p className={large ? "text-sm text-ink-500" : "text-xs text-ink-500"}>{formatTimeOfDay(s.timeOfDay)}</p>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  disabled={busyId === s.id}
                  className="shrink-0 text-xs font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form onSubmit={handleSubmit} className="mt-5 border-t border-black/5 pt-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field
              label="What"
              type="text"
              placeholder="Blood pressure pill"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
            />
            <Field label="Time" type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
          </div>
          {error && <p className="-mt-2 mb-3 text-xs font-medium text-danger-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={!label.trim() || !timeOfDay}>
              Add
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
