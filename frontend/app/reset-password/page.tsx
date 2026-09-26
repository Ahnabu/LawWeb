"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { passwordProblem, resetPassword } from "../../lib/auth";
import { useAuth } from "../../components/AuthProvider";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, logout } = useAuth();
  const [token, setToken] = useState<string | null>(searchParams.get("token"));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep the token in memory and drop it from the address bar so it does not
  // linger in browser history or leak through the Referer header.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("token");
    if (fromUrl) {
      setToken(fromUrl);
      window.history.replaceState(null, "", "/reset-password");
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      // The reset revoked every session, including one open in this browser
      if (status === "authenticated") await logout();
      router.replace("/login?reset=1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset the password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-outline bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";
  const linkProblem = error && /invalid|expired/i.test(error);

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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Password Reset</p>
              <h1 className="mt-2 font-display text-2xl text-on-surface sm:text-3xl">Choose a new password</h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Use at least 8 characters with uppercase, lowercase, a number and a symbol.
                You will be signed out on all devices.
              </p>
            </div>

            {!token ? (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                This reset link is missing or incomplete.{" "}
                <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
                  Request a new link
                </Link>
                .
              </p>
            ) : (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-on-surface-variant">
                  New Password
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`${inputClass} pr-12`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-3 top-2 flex items-center text-on-surface-variant transition hover:text-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>
                <label className="block text-sm font-medium text-on-surface-variant">
                  Confirm New Password
                  <input
                    type={showPassword ? "text" : "password"}
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </label>
                {error && (
                  <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                    {error}{" "}
                    {linkProblem && (
                      <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
                        Request a new link
                      </Link>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-primary transition hover:bg-secondary/90 disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save New Password"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
