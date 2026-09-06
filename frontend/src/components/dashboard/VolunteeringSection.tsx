import { useEffect, useState } from "react";
import { Link } from "react-router";
import { authApi, visitsApi } from "../../lib/api";
import { getCurrentPosition } from "../../lib/geo";
import type { MyClaim, OpenPosting } from "../../lib/postings";
import type { SessionUser } from "../../lib/session";
import { formatVisitTime } from "../../lib/time";
import { Button } from "../shared/Button";

const STATUS_LABEL: Record<MyClaim["status"], string> = {
  open: "Open",
  pending_family_confirm: "Waiting on the family to confirm",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export interface VolunteeringSectionProps {
  user: SessionUser;
  onUpdated: (user: SessionUser) => void;
  className?: string;
}

// The "also volunteering" half of the dashboard — sits alongside "Your circles" rather than
// replacing it, since coordinating your own family's care and volunteering for others are
// independent choices, not a fork you pick once at signup.
export function VolunteeringSection({ user, onUpdated, className }: VolunteeringSectionProps) {
  const [open, setOpen] = useState<OpenPosting[] | null>(null);
  const [mine, setMine] = useState<MyClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState(false);

  function refresh() {
    visitsApi
      .listOpen<OpenPosting[]>()
      .then(setOpen)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load open requests."));
    visitsApi
      .listMine<MyClaim[]>()
      .then(setMine)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your visits."));
  }

  useEffect(refresh, []);

  async function handleClaim(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await visitsApi.claim(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't claim that request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckIn(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const position = await getCurrentPosition();
      await visitsApi.checkIn(id, position);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check in.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckOut(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const position = await getCurrentPosition();
      await visitsApi.checkOut(id, position);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check out.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTurnOff() {
    setTurningOff(true);
    setError(null);
    try {
      const result = await authApi.updateVolunteer<{ user: SessionUser }>({ wantsToVolunteer: false });
      onUpdated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't turn off volunteering.");
      setTurningOff(false);
    }
  }

  const activeClaims = mine?.filter((m) => m.status !== "cancelled" && m.status !== "completed") ?? [];
  const pastClaims = mine?.filter((m) => m.status === "cancelled" || m.status === "completed") ?? [];

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Volunteering</h2>
          <p className="mt-1 text-sm text-ink-500">
            {user.preferredArea ? "Helping out around " + user.preferredArea + "." : "Browse requests and lend a hand."}
          </p>
        </div>
        <button
          onClick={handleTurnOff}
          disabled={turningOff}
          className="shrink-0 text-xs font-semibold text-ink-500 hover:text-ink-700 disabled:opacity-60"
        >
          Turn off
        </button>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-danger-600">{error}</p>}

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-8">
          {activeClaims.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Your visits</h3>
              <ul className="mt-3 space-y-3">
                {activeClaims.map((claim) => (
                  <li key={claim.id} className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-ink-900">{claim.elderFullName}</p>
                        <p className="text-xs text-ink-500">{claim.address ?? claim.area}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-sage-700">
                        {STATUS_LABEL[claim.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-700">{formatVisitTime(claim.scheduledAt)}</p>
                    {claim.notes && <p className="mt-1 text-sm text-ink-500">{claim.notes}</p>}

                    {claim.status === "confirmed" && (
                      <div className="mt-3 flex items-center gap-2">
                        {!claim.checkInAt && (
                          <Button size="default" isLoading={busyId === claim.id} onClick={() => handleCheckIn(claim.id)}>
                            Check in
                          </Button>
                        )}
                        {claim.checkInAt && !claim.checkOutAt && (
                          <Button
                            variant="secondary"
                            isLoading={busyId === claim.id}
                            onClick={() => handleCheckOut(claim.id)}
                          >
                            Check out
                          </Button>
                        )}
                        <Link to={"/circles/" + claim.elderId} className="text-sm font-semibold text-sage-700 hover:text-sage-500">
                          View circle
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pastClaims.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Past visits</h3>
              <ul className="mt-3 space-y-2">
                {pastClaims.map((claim) => (
                  <li key={claim.id} className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm">
                    <span className="text-ink-700">{claim.elderFullName}</span>
                    <span className="text-ink-500">{STATUS_LABEL[claim.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeClaims.length === 0 && pastClaims.length === 0 && (
            <p className="text-sm text-ink-500">Once you offer to help with a request, it'll show up here.</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Open requests</h3>
          {open && open.length === 0 && <p className="mt-3 text-sm text-ink-500">No open requests right now — check back soon.</p>}
          <ul className="mt-3 space-y-3">
            {open?.map((posting) => (
              <li key={posting.id} className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-ink-900">{posting.elderFirstName}</p>
                    <p className="text-xs text-ink-500">{posting.area}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-700">{formatVisitTime(posting.scheduledAt)}</p>
                {posting.notes && <p className="mt-1 text-sm text-ink-500">{posting.notes}</p>}
                <div className="mt-3">
                  <Button isLoading={busyId === posting.id} onClick={() => handleClaim(posting.id)}>
                    Offer to help
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
