import type { Circle } from "../../lib/circles";

const ROLE_LABEL: Record<Circle["role"], string> = {
  family: "Family",
  home_aide: "Home aide",
  other: "Member",
};

export function CircleCard({ circle }: { circle: Circle }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink-900">{circle.fullName}</h3>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-sage-700">
            {ROLE_LABEL[circle.role]}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-sand-100 px-3.5 py-2.5">
        <span className="text-xs text-ink-500">Invite code</span>
        <span className="font-mono text-sm font-semibold tracking-wider text-ink-900">{circle.inviteCode}</span>
      </div>
    </div>
  );
}
