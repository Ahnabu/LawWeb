"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "../../lib/auth";
import { useAuth } from "../../components/AuthProvider";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = searchParams.get("redirect") || "/dashboard/client";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const current = window.localStorage.getItem("postAuthRedirect");
    if (!current && redirectPath) {
      window.localStorage.setItem("postAuthRedirect", redirectPath);
    }
  }, [redirectPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await signIn(email, password);
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
    <main className="auth-page relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),transparent_28%),linear-gradient(180deg,#07111f_0%,#0A1628_30%,var(--clr-surface)_100%)] px-4 sm:px-6  lg:px-10 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-fit rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/70 hover:bg-white/20"
          >
            Back to Home
          </Link>
          <section className="card-elevated overflow-hidden rounded-3xl p-4 backdrop-blur-xl sm:p-8 lg:p-10 mt-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-secondary sm:text-xs">
                  Islam & Associates
                </p>
                <p className="mt-2 max-w-lg font-display text-2xl leading-snug text-on-surface sm:text-3xl lg:text-4xl">
                  Login to your account.
                </p>
                <p className="mt-3 max-w-lg text-sm leading-6 text-on-surface-variant sm:text-base">
                  Use your verified email address and password to reach the
                  correct dashboard automatically.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 rounded-2xl border border-outline-variant/70 bg-surface-container/90 p-5 sm:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">
                  Need help?
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  If you registered but have not verified your account yet, go
                  to the verification page and enter your code.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/verify-email?redirect=${encodeURIComponent(redirectPath)}`}
                  className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-95 hover:shadow-xl"
                >
                  Verify Email
                </Link>
                <Link
                  href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
                  className="rounded-xl border border-outline px-4 py-3 text-center text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </section>
        </div>

        <section className="card-elevated rounded-3xl  backdrop-blur-xl p-4">
          <div className="grid gap-6 rounded-2xl border border-outline-variant bg-surface-container p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Sign In
              </p>
              <h2 className="mt-2 font-display text-2xl text-on-surface sm:text-3xl">
                Welcome back
              </h2>
            </div>

            {/* Role tabs removed — users are redirected to their registered dashboard automatically */}
            <form className="space-y-2" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-on-surface-variant">
                Email Address
                <input
                  type="email"
                  placeholder="admin@lawweb.com"
                  className="mt-2 w-full rounded-xl border border-outline bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm font-medium text-on-surface-variant">
                Password
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-outline bg-surface px-4 py-3.5 pr-12 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant transition hover:text-primary"
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
              </label>
              {error && (
                <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger leading-6">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-primary transition hover:bg-secondary/90"
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
            <div className="flex flex-col gap-4 text-sm text-on-surface-variant">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href="#"
                  className="text-secondary hover:text-secondary/80"
                >
                  Forgot Password?
                </Link>
                <span className="text-right">Verified users only</span>
              </div>
              <div className="border-t border-outline-variant pt-4">
                <p className="text-center leading-6">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
                    className="font-semibold text-secondary underline decoration-2 underline-offset-4 hover:text-primary"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <LoginPageContent />
    </Suspense>
  );
}
