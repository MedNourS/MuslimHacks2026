import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { authApi, eldersApi } from "../lib/api";
import type { Circle } from "../lib/circles";
import { clearSession, getSessionUser, saveSession, type SessionUser } from "../lib/session";
import { AppHeader } from "../components/shared/AppHeader";
import { CircleCard } from "../components/dashboard/CircleCard";
import { CreateCircleForm } from "../components/dashboard/CreateCircleForm";
import { JoinCircleForm } from "../components/dashboard/JoinCircleForm";
import { VolunteerOptIn } from "../components/dashboard/VolunteerOptIn";
import { VolunteeringSection } from "../components/dashboard/VolunteeringSection";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getSessionUser());

  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    eldersApi
      .list<Circle[]>()
      .then(setCircles)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your circles."));
    // `user` is re-parsed from localStorage on every render (new object each time), so it can't
    // be a dependency here without re-running this effect (and re-fetching) on every render —
    // depend on the stable primitive id instead.
  }, [user?.id, navigate]);

  // An elder-only account that isn't also volunteering has exactly one thing to look at — skip
  // the dashboard grid entirely and go straight there. (An elder account that also volunteers
  // still lands here, since there's now a second section worth seeing.)
  useEffect(() => {
    if (user && !user.wantsToVolunteer && circles && circles.length === 1 && circles[0].role === "elder") {
      navigate("/circles/" + circles[0].id, { replace: true });
    }
  }, [user, circles, navigate]);

  if (!user) return null;

  async function handleLogOut() {
    try {
      await authApi.logout();
    } catch {
      // Clear local state regardless — worst case the cookie outlives its expiry on the server.
    }
    clearSession();
    navigate("/");
  }

  function handleAdded(circle: Circle) {
    setCircles((prev) => [...(prev ?? []), circle]);
    setShowAdd(false);
  }

  function handleVolunteerUpdated(updated: SessionUser) {
    saveSession(updated);
    setUser(updated);
  }

  const isElderOnly = circles !== null && circles.length > 0 && circles.every((c) => c.role === "elder");

  return (
    <div className="min-h-screen bg-sand-100">
      <AppHeader onLogOut={handleLogOut} />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1.5 text-sm text-ink-500">Your circles, and your volunteering, in one place.</p>

        {error && <p className="mt-4 text-sm font-medium text-danger-600">{error}</p>}

        {circles === null && !error && <p className="mt-8 text-sm text-ink-500">Loading…</p>}

        {circles && circles.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Your circles</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {circles.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>

            {!isElderOnly && !showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 text-sm font-semibold text-sage-700 hover:text-sage-500"
              >
                + Add another circle
              </button>
            )}
          </section>
        )}

        {circles && circles.length === 0 && (
          <div className="mt-8 max-w-md rounded-2xl border border-dashed border-ink-200 bg-white/60 p-6 text-center">
            <p className="text-sm text-ink-700">You're not in a circle yet. Start one, or join with a code someone sent you.</p>
          </div>
        )}

        {circles && !isElderOnly && (circles.length === 0 || showAdd) && (
          <div className="mt-6 grid max-w-2xl gap-5 sm:grid-cols-2">
            <CreateCircleForm onCreated={handleAdded} />
            <JoinCircleForm onJoined={handleAdded} />
          </div>
        )}

        {circles && (
          <div className="mt-10 border-t border-ink-200 pt-8">
            {user.wantsToVolunteer ? (
              <VolunteeringSection user={user} onUpdated={handleVolunteerUpdated} />
            ) : (
              <VolunteerOptIn onUpdated={handleVolunteerUpdated} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
