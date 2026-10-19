"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { resendVerificationCode, verifyEmail } from "../../lib/auth";
import { AuthShell } from "../../components/AuthShell";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    code?: string;
  }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // The backend sends at most one code per minute per account
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const storedEmail = window.localStorage.getItem("pendingVerificationEmail");

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
      // A newly verified account always lands on its own dashboard; drop any
      // redirect saved earlier in the login/register flow.
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("postAuthRedirect");
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
      setResendCooldown(60);
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
    <AuthShell backHref="/" backLabel="Back to Home">
      <h1 className="text-2xl text-heading sm:text-[1.75rem]">Enter the code sent to your inbox.</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        We send a 6-digit verification code for every new account. Use the
        same email you registered with.
      </p>

      <div className="panel mt-5 p-4">
        <p className="text-sm font-semibold text-on-surface">What happens next</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-on-surface-variant marker:text-secondary">
          <li>Enter your email and the 6-digit code.</li>
          <li>We will activate your account as soon as the code matches.</li>
          <li>If the code expires, use resend to get a new one.</li>
        </ul>
      </div>

      {error && (
        <div className="notice notice-error mt-5" role="alert">
          {error}
        </div>
      )}

      {message && <div className="notice notice-info mt-5">{message}</div>}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="label">Email Address</span>
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
            className={`field${fieldErrors.email ? " field-invalid" : ""}`}
            placeholder="john@example.com"
            required
            autoComplete="email"
          />
          {fieldErrors.email && <p className="error-text">{fieldErrors.email}</p>}
        </label>

        <label className="block">
          <span className="label">Verification Code</span>
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
            className={`field text-center font-semibold tracking-[0.35em]${fieldErrors.code ? " field-invalid" : ""}`}
            placeholder="123456"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          {fieldErrors.code && <p className="error-text">{fieldErrors.code}</p>}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg btn-block"
        >
          {isSubmitting ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0 || !email.trim()}
          className="btn btn-secondary"
        >
          {isResending ? "Resending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
        </button>
        <Link href="/login" className="btn btn-ghost">
          Back to Login
        </Link>
      </div>

      <hr className="rule my-6" />
      <p className="text-center text-sm text-on-surface-variant">
        <Link href="/register" className="text-link">
          Create Account
        </Link>
      </p>
    </AuthShell>
  );
}
