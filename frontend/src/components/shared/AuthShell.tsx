import type { ReactNode } from "react";
import { Link } from "react-router";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-sand-100 p-6">
      <Link to="/" className="flex items-center gap-2.5">
        <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
          <circle cx="41.53" cy="37.5" r="20" fill="#4A7C6B" opacity="0.9" />
          <circle cx="22.47" cy="37.5" r="20" fill="#C9784F" opacity="0.85" />
          <circle cx="32" cy="21" r="20" fill="#D4A94A" opacity="0.95" />
        </svg>
        <span className="text-xl font-extrabold text-ink-900">Care Circle</span>
      </Link>
      {children}
    </div>
  );
}
