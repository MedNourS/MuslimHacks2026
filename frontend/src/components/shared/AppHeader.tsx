import { Link } from "react-router";

export interface AppHeaderProps {
  onLogOut?: () => void;
}

export function AppHeader({ onLogOut }: AppHeaderProps) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link to="/dashboard" className="flex items-center gap-2.5">
        <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
          <circle cx="41.53" cy="37.5" r="20" fill="#4A7C6B" opacity="0.9" />
          <circle cx="22.47" cy="37.5" r="20" fill="#C9784F" opacity="0.85" />
          <circle cx="32" cy="21" r="20" fill="#D4A94A" opacity="0.95" />
        </svg>
        <span className="text-lg font-extrabold text-ink-900">Care Circle</span>
      </Link>
      {onLogOut && (
        <button onClick={onLogOut} className="px-3 py-2 text-sm font-semibold text-ink-900 hover:text-sage-700">
          Log out
        </button>
      )}
    </header>
  );
}
