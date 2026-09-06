import { useEffect, useState } from "react";
import { Link } from "react-router";
import { visitsApi } from "../../lib/api";
import { getCurrentPosition } from "../../lib/geo";
import type { MyClaim, OpenPosting } from "../../lib/postings";
import type { SessionUser } from "../../lib/session";
import { formatVisitTime } from "../../lib/time";
import { AppHeader } from "../shared/AppHeader";
import { Button } from "../shared/Button";

const STATUS_LABEL: Record<MyClaim["status"], string> = {
  open: "Open",
  pending_family_confirm: "Waiting on the family to confirm",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export interface VolunteerDashboardProps {
  user: SessionUser;
  onLogOut: () => void;
}

export function VolunteerDashboard({ user, onLogOut }: VolunteerDashboardProps) {
  const [open, setOpen] = useState<OpenPosting[] | null>(null);
  const [mine, setMine] = useState<MyClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const activeClaims = mine?.filter((m) => m.status !== "cancelled" && m.status !== "completed") ?? [];
  const pastClaims = mine?.filter((m) => m.status === "cancelled" || m.status === "completed") ?? [];

  return (
    <div className="min-h-screen bg-sand-100">
      <AppHeader onLogOut={onLogOut} />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {user.preferredArea ? "Helping out around " + user.preferredArea + "." : "Browse requests and lend a hand."}
        </p>

        {error && <p className="mt-4 text-sm font-medium text-danger-600">{error}</p>}

        {activeClaims.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Your visits</h2>
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
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Open requests</h2>
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
        </section>

        {pastClaims.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Past visits</h2>
            <ul className="mt-3 space-y-2">
              {pastClaims.map((claim) => (
                <li key={claim.id} className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm">
                  <span className="text-ink-700">{claim.elderFullName}</span>
                  <span className="text-ink-500">{STATUS_LABEL[claim.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
