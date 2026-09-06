import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { eldersApi } from "../../lib/api";
import type { Circle } from "../../lib/circles";
import { Button } from "../shared/Button";
import { Field } from "../shared/Field";

export interface CreateCircleFormProps {
  onCreated: (circle: Circle) => void;
  className?: string;
}

export function CreateCircleForm({ onCreated, className }: CreateCircleFormProps) {
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const elder = await eldersApi.create<Circle>({ fullName, area, address: address.trim() || undefined });
      onCreated(elder);
      setFullName("");
      setArea("");
      setAddress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx("rounded-2xl border border-black/10 bg-white p-6", className)}>
      <h3 className="text-base font-bold text-ink-900">Start a circle</h3>
      <p className="mb-4 mt-1 text-sm text-ink-500">Add the person you're coordinating care for.</p>

      <Field
        label="Their full name"
        type="text"
        placeholder="Samira Haddad"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <Field
        label="General area"
        type="text"
        placeholder="Verdun, Montreal"
        value={area}
        onChange={(e) => setArea(e.target.value)}
        helperText="Shown to volunteers browsing requests, never their exact address."
        required
      />

      <Field
        label="Address (optional)"
        type="text"
        placeholder="123 Rue Wellington"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        helperText="Only ever shown to the family, the elder, and a confirmed volunteer."
      />

      {error && <p className="mb-4 text-sm font-medium text-danger-600">{error}</p>}

      <Button type="submit" fullWidth isLoading={submitting}>
        Create circle
      </Button>
    </form>
  );
}
