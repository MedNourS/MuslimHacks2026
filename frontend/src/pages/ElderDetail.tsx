import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { eldersApi } from "../lib/api";
import type { CircleDetail } from "../lib/circles";
import { getSessionUser } from "../lib/session";
import { Button } from "../components/shared/Button";
import { TimelineFeed } from "../components/timeline/TimelineFeed";
import { VisitsPanel } from "../components/visits/VisitsPanel";

const ROLE_LABEL: Record<CircleDetail["role"], string> = {
  family: "Family",
  home_aide: "Home aide",
  other: "Member",
  elder: "Elder",
};

export default function ElderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = getSessionUser();

  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [elderLinkCopied, setElderLinkCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!id) return;

    eldersApi
      .getById<CircleDetail>(id)
      .then(setCircle)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this circle."));
  }, [id, user, navigate]);

  if (!user) return null;

  async function handleCopy() {
    if (!circle) return;
    try {
      await navigator.clipboard.writeText(circle.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — the code is already visible on screen.
    }
  }

  async function handleCopyElderLink() {
    if (!circle) return;
    const link = window.location.origin + "/signup?inviteCode=" + circle.inviteCode + "&asElder=1";
    try {
      await navigator.clipboard.writeText(link);
      setElderLinkCopied(true);
      setTimeout(() => setElderLinkCopied(false), 2000);
    } catch {
      // Clipboard access denied.
    }
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
      </header>

      <main className="mx-auto max-w-3xl px-6 py-6">
        <Link to="/dashboard" className="text-sm font-semibold text-sage-700 hover:text-sage-500">
          ← Back to your circles
        </Link>

        {error && <p className="mt-6 text-sm font-medium text-danger-600">{error}</p>}

        {!circle && !error && <p className="mt-6 text-ink-500">Loading…</p>}

        {circle && (
          <>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-ink-900">{circle.fullName}</h1>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-sage-700">
                  You're in this circle as {ROLE_LABEL[circle.role]}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-900">Invite code</p>
                  <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-ink-900">{circle.inviteCode}</p>
                </div>
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-ink-500">Share this code with anyone who should join {circle.fullName}'s circle.</p>
            </div>

            {!circle.members.some((m) => m.role === "elder") && (
              <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
                <p className="text-sm font-bold text-ink-900">Invite {circle.fullName} to their own account</p>
                <p className="mt-1 text-xs text-ink-500">
                  Send this link so {circle.fullName.split(" ")[0]} can sign up and see their own circle.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="secondary" onClick={handleCopyElderLink}>
                    {elderLinkCopied ? "Copied" : "Copy signup link"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-sm font-bold text-ink-900">
                Circle members ({circle.members.length})
              </h2>
              <ul className="mt-4 divide-y divide-black/5">
                {circle.members.map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{member.name}</p>
                      <p className="text-xs text-ink-500">{member.email}</p>
                    </div>
                    <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sage-700">
                      {ROLE_LABEL[member.role]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <VisitsPanel elderId={circle.id} />
            <TimelineFeed elderId={circle.id} />
          </>
        )}
      </main>
    </div>
  );
}
