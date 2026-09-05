import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authApi } from "../../lib/api";
import { saveSession, type AuthResponse } from "../../lib/session";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Field } from "../shared/Field";

export interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.login<AuthResponse>({ email, password });
      saveSession(result.token, result.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx("w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7", className)}>
      <h1 className="text-lg font-extrabold text-ink-900">Welcome back</h1>
      <p className="mb-5 text-xs text-ink-500">Log in to your care circle.</p>

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="mb-4.5 mt-1">
        <Checkbox label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
      </div>

      {error && <p className="mb-4 text-sm font-medium text-danger-600">{error}</p>}

      <Button type="submit" fullWidth isLoading={submitting}>
        Log in
      </Button>

      <p className="mt-4 text-center text-xs text-ink-500">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-sage-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}
