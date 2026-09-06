import { useState, type FormEvent } from "react";
import { authApi } from "../../lib/api";
import type { SessionUser } from "../../lib/session";
import { Button } from "../shared/Button";
import { Field } from "../shared/Field";

export interface VolunteerOptInProps {
  onUpdated: (user: SessionUser) => void;
  className?: string;
}

export function VolunteerOptIn({ onUpdated, className }: VolunteerOptInProps) {
  const [open, setOpen] = useState(false);
  const [preferredArea, setPreferredArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.updateVolunteer<{ user: SessionUser }>({ wantsToVolunteer: true, preferredArea });
      onUpdated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't turn on volunteering.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={className}>
      <div className="rounded-2xl border border-dashed border-ink-300 bg-white/60 p-6">
        <p className="text-sm font-bold text-ink-900">Want to help other families too?</p>
        <p className="mt-1 text-sm text-ink-500">
          Turn on volunteering to browse requests from other families nearby and offer to help — alongside your own circle(s) above.
        </p>

        {!open ? (
          <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}>
            Turn on volunteering
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 max-w-sm">
            <Field
              label="Area you can help in"
              type="text"
              placeholder="Verdun, Montreal"
              value={preferredArea}
              onChange={(e) => setPreferredArea(e.target.value)}
              helperText="Shown so you can browse requests near you."
              required
            />
            {error && <p className="mb-3 text-sm font-medium text-danger-600">{error}</p>}
            <Button type="submit" isLoading={submitting}>
              Save
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
