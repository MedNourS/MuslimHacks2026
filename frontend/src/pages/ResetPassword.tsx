import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { authApi } from "../lib/api";
import { AuthShell } from "../components/shared/AuthShell";
import { Button } from "../components/shared/Button";
import { Field } from "../components/shared/Field";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token — request a new one.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <div className="w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7 text-center">
          <h1 className="text-lg font-extrabold text-ink-900">Link missing its token</h1>
          <p className="mt-2 text-sm text-ink-700">
            Open this page from the link in the reset email, or request a new one.
          </p>
          <Link to="/forgot-password" className="mt-5 inline-block text-sm font-semibold text-sage-700">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <div className="w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7 text-center">
          <h1 className="text-lg font-extrabold text-ink-900">Password updated</h1>
          <p className="mt-2 text-sm text-ink-700">Log in with your new password.</p>
          <Button fullWidth className="mt-5" onClick={() => navigate("/login")}>
            Go to log in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7">
        <h1 className="text-lg font-extrabold text-ink-900">Set a new password</h1>
        <p className="mb-5 text-xs text-ink-500">Make it at least 8 characters.</p>

        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error && <p className="mb-4 text-sm font-medium text-danger-600">{error}</p>}

        <Button type="submit" fullWidth isLoading={submitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
