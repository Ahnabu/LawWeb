"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { resendVerificationCode, verifyEmail } from "../../lib/auth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [redirectPath, setRedirectPath] = useState(
    "/dashboard/client/appointment",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    code?: string;
  }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const redirectParam = params.get("redirect");
    const storedEmail = window.localStorage.getItem("pendingVerificationEmail");
    const storedRedirect = window.localStorage.getItem("postAuthRedirect");

    if (redirectParam && redirectParam.startsWith("/")) {
      setRedirectPath(redirectParam);
      window.localStorage.setItem("postAuthRedirect", redirectParam);
    } else if (storedRedirect) {
      setRedirectPath(storedRedirect);
    }

    if (emailParam && emailParam !== "undefined") {
      setEmail(emailParam);
      window.localStorage.setItem("pendingVerificationEmail", emailParam);
      return;
    }

    if (storedEmail) {
      setEmail(storedEmail);
      return;
    }
  }, []);

  const validateForm = () => {
    const nextFieldErrors: typeof fieldErrors = {};

    if (!email.trim()) {
      nextFieldErrors.email = "Email is required";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextFieldErrors.email = "Enter a valid email address";
    }

    if (!/^\d{6}$/.test(code)) {
      nextFieldErrors.code = "Enter the 6-digit code from your email";
    }

    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await verifyEmail(email, code);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("pendingVerificationEmail");
      }
      login(data.user);
      const nextRedirect =
        typeof window !== "undefined"
          ? window.localStorage.getItem("postAuthRedirect")
          : null;
      if (nextRedirect) {
        window.localStorage.removeItem("postAuthRedirect");
        router.push(nextRedirect);
        return;
      }

      router.push(`/dashboard/${data.user.role}`);
    } catch (submitError) {
      const text =
        submitError instanceof Error
          ? submitError.message
          : "Unable to verify right now";
      setError(text);

      const lowerText = text.toLowerCase();
      if (lowerText.includes("email")) {
        setFieldErrors((current) => ({ ...current, email: text }));
      }
      if (lowerText.includes("code") || lowerText.includes("verification")) {
        setFieldErrors((current) => ({ ...current, code: text }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setMessage(null);
    setFieldErrors((current) => ({ ...current, email: undefined }));

    if (!email.trim()) {
      setFieldErrors((current) => ({
        ...current,
        email: "Email is required to resend the code",
      }));
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerificationCode(email);
      setMessage(result.message);
    } catch (resendError) {
      const text =
        resendError instanceof Error
          ? resendError.message
          : "Unable to resend the code";
      setError(text);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="auth-page relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),transparent_28%),linear-gradient(180deg,#07111f_0%,#0A1628_30%,var(--clr-surface)_100%)] px-4 sm:px-6 lg:px-10 py-4">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="inline-flex w-fit rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/70 hover:bg-white/20"
        >
          Back to Home
        </Link>
      </div>
      <div className="mx-auto mt-3 flex w-full max-w-6xl flex-col gap-4 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <section className="card-elevated overflow-hidden rounded-3xl p-4 backdrop-blur-xl sm:p-6 lg:p-7">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-secondary sm:text-[0.65rem]">
              Verify Email
            </p>
            <h3 className="mt-2 max-w-lg font-display text-2xl leading-tight text-on-surface sm:text-3xl lg:text-4xl">
              Enter the code sent to your inbox.
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">
              We send a 6-digit verification code for every new account. Use the
              same email you registered with.
            </p>
          </div>

          <div className="mt-3 grid gap-3 rounded-2xl border border-outline-variant/70 bg-surface-container/90 p-4 sm:p-5">
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.16em] text-secondary">
                What happens next
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                <li>• Enter your email and the 6-digit code.</li>
                <li>
                  • We will activate your account as soon as the code matches.
                </li>
                <li>• If the code expires, use resend to get a new one.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                className="rounded-xl border border-outline px-4 py-2.5 text-center text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary"
              >
                Back to Login
              </Link>
              <Link
                href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
                className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-95 hover:shadow-xl"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>

        <section className="card-elevated rounded-3xl backdrop-blur-xl p-4">
          <div className="grid gap-4 rounded-2xl border border-outline-variant bg-surface-container p-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
                Account Activation
              </p>
              <h4 className="mt-2 font-display text-xl text-on-surface sm:text-2xl">
                Verify your account
              </h4>
            </div>

            {error && (
              <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-on-surface">
                {message}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-on-surface-variant">
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                  }}
                  className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.email ? "border-error" : "border-outline"}`}
                  placeholder="john@example.com"
                  required
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="mt-2 text-xs text-error">{fieldErrors.email}</p>
                )}
              </label>

              <label className="block text-sm font-medium text-on-surface-variant">
                Verification Code
                <input
                  type="text"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setFieldErrors((current) => ({
                      ...current,
                      code: undefined,
                    }));
                  }}
                  className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3 text-center tracking-[0.35em] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.code ? "border-error" : "border-outline"}`}
                  placeholder="123456"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                {fieldErrors.code && (
                  <p className="mt-2 text-xs text-error">{fieldErrors.code}</p>
                )}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-px hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Verifying..." : "Verify Email"}
              </button>
            </form>

            <div className="grid gap-3 rounded-2xl bg-surface-dim p-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || !email.trim()}
                className="rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? "Resending..." : "Resend Code"}
              </button>
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                className="rounded-xl border border-outline px-4 py-2.5 text-center text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
