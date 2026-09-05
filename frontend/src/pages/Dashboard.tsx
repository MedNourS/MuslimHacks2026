import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { eldersApi } from "../lib/api";
import type { Circle } from "../lib/circles";
import { clearSession, getSessionUser } from "../lib/session";
import { CircleCard } from "../components/dashboard/CircleCard";
import { CreateCircleForm } from "../components/dashboard/CreateCircleForm";
import { JoinCircleForm } from "../components/dashboard/JoinCircleForm";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getSessionUser();

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
  }, [user, navigate]);

  if (!user) return null;

  function handleAdded(circle: Circle) {
    setCircles((prev) => [...(prev ?? []), circle]);
    setShowAdd(false);
  }

  function handleLogOut() {
    clearSession();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
            <circle cx="41.53" cy="37.5" r="20" fill="#4A7C6B" opacity="0.9" />
            <circle cx="22.47" cy="37.5" r="20" fill="#C9784F" opacity="0.85" />
            <circle cx="32" cy="21" r="20" fill="#D4A94A" opacity="0.95" />
          </svg>
          <span className="text-lg font-extrabold text-ink-900">Care Circle</span>
        </Link>
        <button onClick={handleLogOut} className="px-3 py-2 text-sm font-semibold text-ink-900 hover:text-sage-700">
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Welcome back, {user.name.split(" ")[0]}</h1>

        {error && <p className="mt-4 text-sm font-medium text-danger-600">{error}</p>}

        {circles && circles.length > 0 && (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {circles.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>

            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-6 text-sm font-semibold text-sage-700 hover:text-sage-500"
              >
                + Add another circle
              </button>
            )}
          </>
        )}

        {circles && circles.length === 0 && (
          <p className="mt-3 max-w-md text-ink-700">You're not in a circle yet. Start one, or join with a code someone sent you.</p>
        )}

        {circles && (circles.length === 0 || showAdd) && (
          <div className="mt-6 grid max-w-2xl gap-5 sm:grid-cols-2">
            <CreateCircleForm onCreated={handleAdded} />
            <JoinCircleForm onJoined={handleAdded} />
          </div>
        )}
      </main>
    </div>
  );
}
