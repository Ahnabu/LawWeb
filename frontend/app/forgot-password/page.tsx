"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset } from "../../lib/auth";

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
    <main className="auth-page relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),transparent_28%),linear-gradient(180deg,#07111f_0%,#0A1628_30%,var(--clr-surface)_100%)] px-4 sm:px-6 lg:px-10 py-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Link
          href="/login"
          className="w-fit rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/70 hover:bg-white/20"
        >
          Back to Login
        </Link>

        <section className="card-elevated rounded-3xl backdrop-blur-xl p-4">
          <div className="grid gap-6 rounded-2xl border border-outline-variant bg-surface-container p-4 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Password Help</p>
              <h1 className="mt-2 font-display text-2xl text-on-surface sm:text-3xl">Forgot your password?</h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Enter the email address on your account and we&apos;ll send you a link to choose a new password.
                The link is valid for 30 minutes.
              </p>
            </div>

            {message ? (
              <div className="space-y-4">
                <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
                  {message}
                </p>
                <p className="text-sm leading-6 text-on-surface-variant">
                  Didn&apos;t get it? Check your spam folder, or wait a minute and{" "}
                  <button type="button" onClick={() => setMessage(null)} className="font-semibold text-secondary underline underline-offset-4">
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-on-surface-variant">
                  Email Address
                  <input
                    type="email"
                    className="mt-2 w-full rounded-xl border border-outline bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                {error && (
                  <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-primary transition hover:bg-secondary/90 disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
