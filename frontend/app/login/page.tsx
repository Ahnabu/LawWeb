"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { postLoginPath, safeRedirectPath, signIn } from "../../lib/auth";
import { ACCOUNT_BLOCKED_CODE, consumeAuthNotice } from "../../lib/http";
import { useAuth } from "../../components/AuthProvider";
import { AuthShell } from "../../components/AuthShell";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, consumePostAuthRedirect } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set when the account is blocked: on a login attempt, or when an open
  // session was ended by the block (lib/http.ts leaves the notice behind)
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  useEffect(() => {
    const notice = consumeAuthNotice();
    if (notice) setBlockedNotice(notice);
  }, []);

  // No default here: without an explicit ?redirect= the user goes to their own
  // role's dashboard. The old "/dashboard/client" default was saved to
  // localStorage on every visit, so admins were sent to the client dashboard,
  // whose role guard then logged them out.
  const redirectParam = safeRedirectPath(searchParams.get("redirect"));
  const resetDone = searchParams.get("reset") === "1";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBlockedNotice(null);
    setIsSubmitting(true);

    try {
      const data = await signIn(email, password);
      login(data.user);
      // ?redirect= wins over a redirect saved earlier (e.g. by the booking form)
      const saved = consumePostAuthRedirect();
      router.replace(postLoginPath(data.user.role, redirectParam ?? saved));
    } catch (submitError: unknown) {
      const err = submitError as { verificationRequired?: boolean; email?: string; message?: string; code?: string };
      if (err.code === ACCOUNT_BLOCKED_CODE) {
        setBlockedNotice(err.message || "Your account has been blocked. Contact the firm for help.");
        return;
      }
      if (err.verificationRequired && err.email) {
        const next = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : "";
        router.push(`/verify-email?email=${encodeURIComponent(err.email)}${next}`);
        return;
      }
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to login right now";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell backHref="/" backLabel="Back to Home">
      <h1 className="text-2xl text-heading sm:text-[1.75rem]">Login to your account.</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        Use your verified email address and password to reach the
        correct dashboard automatically.
      </p>

      {/* Role tabs removed — users are redirected to their registered dashboard automatically */}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="label">Email Address</span>
          <input
            type="email"
            placeholder="admin@lawweb.com"
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="label">Password</label>
            <Link
              href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
              className="text-link text-sm font-medium"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="field pr-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {blockedNotice && (
          <div role="alert" className="notice notice-error flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Account blocked</p>
              <p>{blockedNotice}</p>
            </div>
          </div>
        )}
        {resetDone && !error && !blockedNotice && (
          <p className="notice notice-success">
            Your password was updated. Log in with your new password.
          </p>
        )}
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg btn-block"
        >
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>

      <hr className="rule my-6" />
      <p className="text-center text-sm leading-6 text-on-surface-variant">
        Don&apos;t have an account?{" "}
        <Link
          href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
          className="text-link"
        >
          Sign up here
        </Link>
      </p>
      <p className="mt-1 text-center text-xs text-on-surface-variant">Verified users only</p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <LoginPageContent />
    </Suspense>
  );
}
