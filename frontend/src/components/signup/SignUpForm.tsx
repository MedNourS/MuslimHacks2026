import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { authApi, eldersApi } from "../../lib/api";
import { isValidPhoneNumber } from "../../lib/phone";
import { saveSession, type AuthResponse } from "../../lib/session";
import { Button } from "../shared/Button";
import { Field } from "../shared/Field";

export interface SignUpFormProps {
  className?: string;
}

export function SignUpForm({ className }: SignUpFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("inviteCode");
  const asElder = searchParams.get("asElder") === "1";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneError("Enter a valid phone number, e.g. +1 514 555 0123");
      return;
    }
    setPhoneError(null);

    setSubmitting(true);
    try {
      const result = await authApi.signup<AuthResponse>({ name, email, phoneNumber, password });
      saveSession(result.user);

      if (inviteCode) {
        try {
          await eldersApi.join({ inviteCode, asElder });
        } catch (joinErr) {
          // Account was created either way — surface the join problem but don't block navigation.
          setError(joinErr instanceof Error ? joinErr.message : "Couldn't join that circle automatically.");
        }
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx("w-full max-w-sm rounded-[20px] border border-black/10 bg-white p-7", className)}>
      <h1 className="text-lg font-extrabold text-ink-900">Create your account</h1>
      <p className="mb-5 text-xs text-ink-500">
        {inviteCode ? "You've been invited to a care circle." : "Start coordinating care for a family member."}
      </p>

      <Field
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Soraya Nasser"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
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
        label="Phone number"
        type="tel"
        autoComplete="tel"
        placeholder="(514) 555-0123"
        value={phoneNumber}
        onChange={(e) => {
          setPhoneNumber(e.target.value);
          if (phoneError) setPhoneError(null);
        }}
        onBlur={(e) => {
          if (e.target.value && !isValidPhoneNumber(e.target.value)) {
            setPhoneError("Enter a valid phone number, e.g. +1 514 555 0123");
          }
        }}
        error={phoneError ?? undefined}
        required
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <p className="mb-4 text-sm font-medium text-danger-600">{error}</p>}

      <Button type="submit" fullWidth isLoading={submitting}>
        Create account
      </Button>

      <p className="mt-4 text-center text-xs text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-sage-700">
          Log in
        </Link>
      </p>
    </form>
  );
}
