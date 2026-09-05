import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { eldersApi } from "../../lib/api";
import type { Circle } from "../../lib/circles";
import { Button } from "../shared/Button";
import { Field } from "../shared/Field";

export interface JoinCircleFormProps {
  onJoined: (circle: Circle) => void;
  className?: string;
}

export function JoinCircleForm({ onJoined, className }: JoinCircleFormProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [asElder, setAsElder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const elder = await eldersApi.join<Circle>({ inviteCode, asElder });
      onJoined(elder);
      setInviteCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx("rounded-2xl border border-black/10 bg-white p-6", className)}>
      <h3 className="text-base font-bold text-ink-900">Join a circle</h3>
      <p className="mb-4 mt-1 text-sm text-ink-500">Enter the invite code someone in the circle sent you.</p>

      <Field
        label="Invite code"
        type="text"
        placeholder="7K3PXQ"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
        maxLength={6}
        required
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={asElder}
          onChange={(e) => setAsElder(e.target.checked)}
          className="h-4 w-4 rounded border-black/20 text-sage-500 focus:ring-sage-300"
        />
        I'm the person being cared for
      </label>

      {error && <p className="mb-4 text-sm font-medium text-danger-600">{error}</p>}

      <Button type="submit" variant="secondary" fullWidth isLoading={submitting}>
        Join circle
      </Button>
    </form>
  );
}
