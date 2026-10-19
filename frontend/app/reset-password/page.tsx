"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { passwordProblem, resetPassword } from "../../lib/auth";
import { useAuth } from "../../components/AuthProvider";
import { AuthShell } from "../../components/AuthShell";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, logout } = useAuth();
  const [token, setToken] = useState<string | null>(searchParams.get("token"));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset the password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkProblem = error && /invalid|expired/i.test(error);

  return (
    <AuthShell backHref="/login" backLabel="Back to Login">
      <h1 className="text-2xl text-heading sm:text-[1.75rem]">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        Use at least 8 characters with uppercase, lowercase, a number
        and a symbol. You will be signed out on all devices.
      </p>

      {!token ? (
        <p className="notice notice-error mt-6">
          This reset link is missing or incomplete.{" "}
          <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
            Request a new link
          </Link>
          .
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reset-password" className="label">New Password</label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                className="field pr-12"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="reset-password-confirm" className="label">Confirm New Password</label>
            <div className="relative">
              <input
                id="reset-password-confirm"
                type={showConfirmPassword ? "text" : "password"}
                className="field pr-12"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="notice notice-error" role="alert">
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
            className="btn btn-primary btn-lg btn-block"
          >
            {isSubmitting ? "Saving..." : "Save New Password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
