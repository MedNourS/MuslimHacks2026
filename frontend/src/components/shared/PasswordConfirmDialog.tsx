import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import { Field } from "./Field";

export interface PasswordConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}

// A password re-entry gate for an action that shouldn't happen from a single stray tap. Not a
// security boundary (the session is already authenticated) — just friction on the way to an
// irreversible-feeling action, with a real server-side check behind it (authApi.verifyPassword)
// rather than just a client-side "are you sure".
export function PasswordConfirmDialog({ title, description, confirmLabel = "Confirm", onConfirm, onCancel }: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-7">
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        <div className="mt-4">
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <p className="-mt-2 mb-3 text-xs font-medium text-danger-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-ink-500 hover:text-ink-700">
            Cancel
          </button>
          <Button type="submit" isLoading={submitting} disabled={!password}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
