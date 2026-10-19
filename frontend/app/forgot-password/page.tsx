"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset } from "../../lib/auth";
import { AuthShell } from "../../components/AuthShell";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send the reset email right now");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell backHref="/login" backLabel="Back to Login">
      <h1 className="text-2xl text-heading sm:text-[1.75rem]">Forgot your password?</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        Enter the email address on your account and we&apos;ll send you a link to choose a new password.
        The link is valid for 30 minutes.
      </p>

      {message ? (
        <div className="mt-6 space-y-4">
          <p className="notice notice-success">{message}</p>
          <p className="text-sm leading-6 text-on-surface-variant">
            Didn&apos;t get it? Check your spam folder, or wait a minute and{" "}
            <button type="button" onClick={() => setMessage(null)} className="text-link">
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="label">Email Address</span>
            <input
              type="email"
              className="field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {error && (
            <p className="notice notice-error" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-lg btn-block"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
