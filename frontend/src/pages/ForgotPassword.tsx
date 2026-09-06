import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { authApi } from "../lib/api";
import { AuthShell } from "../components/shared/AuthShell";
import { Button } from "../components/shared/Button";
import { Field } from "../components/shared/Field";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // The API returns the same { ok: true } whether or not the email is registered — that's
      // on purpose (see backend/src/endpoints/auth/auth.services.ts), so there's nothing to
      // branch on here either. One outcome, always.
      await authApi.forgotPassword({ email });
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7 text-center">
          <h1 className="text-lg font-extrabold text-ink-900">Check your email</h1>
          <p className="mt-2 text-sm text-ink-700">
            If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. It expires in 30
            minutes.
          </p>
          <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-sage-700">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7">
          <h1 className="text-lg font-extrabold text-ink-900">Reset your password</h1>
          <p className="mb-5 text-xs text-ink-500">We'll email you a link to set a new one.</p>

          <Field
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" fullWidth isLoading={submitting}>
            Send reset link
          </Button>

          <p className="mt-4 text-center text-xs text-ink-500">
            <Link to="/login" className="font-semibold text-sage-700">
              Back to log in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
