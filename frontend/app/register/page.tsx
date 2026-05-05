"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signUp } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"client" | "lawyer">("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [barId, setBarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    barId?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const redirectPath =
    searchParams.get("redirect") || "/dashboard/client/appointment";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const current = window.localStorage.getItem("postAuthRedirect");
    if (!current && redirectPath) {
      window.localStorage.setItem("postAuthRedirect", redirectPath);
    }
  }, [redirectPath]);

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Calculate password strength
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[@$!%*?&]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    calculatePasswordStrength(pwd);
  };

  const validateForm = () => {
    const nextFieldErrors: typeof fieldErrors = {};

    const fail = (field: keyof typeof fieldErrors, message: string) => {
      nextFieldErrors[field] = message;
      setFieldErrors(nextFieldErrors);
      return false;
    };

    if (!name.trim()) {
      return fail("name", "Name is required");
    }
    if (name.length < 2) {
      return fail("name", "Name must be at least 2 characters");
    }
    if (!email.trim()) {
      return fail("email", "Email is required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("email", "Invalid email format");
    }
    if (!password) {
      return fail("password", "Password is required");
    }
    if (password.length < 8) {
      return fail("password", "Password must be at least 8 characters");
    }
    if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[@$!%*?&]/.test(password)
    ) {
      return fail(
        "password",
        "Password must contain uppercase, lowercase, number and special character",
      );
    }
    if (password !== confirmPassword) {
      return fail("confirmPassword", "Passwords do not match");
    }
    if (role === "lawyer" && !barId.trim()) {
      return fail("barId", "Bar ID is required for lawyers");
    }
    if (!phone.trim()) {
      return fail("phone", "Phone number is required");
    }
    if (
      !/^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/.test(phone.replace(/[\s\-()]/g, ""))
    ) {
      return fail(
        "phone",
        "Enter a valid Bangladeshi phone number, such as +8801XXXXXXXXX",
      );
    }

    setFieldErrors(nextFieldErrors);
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signUp(
        name.trim(),
        normalizedEmail,
        password,
        role,
        phone.trim(),
        role === "lawyer" ? barId.trim() : undefined,
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "pendingVerificationEmail",
          normalizedEmail,
        );
        window.localStorage.setItem("postAuthRedirect", redirectPath);
      }
      router.push(
        `/verify-email?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent(redirectPath)}`,
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to register right now";
      setError(message);

      if (message.toLowerCase().includes("already exists")) {
        setFieldErrors((current) => ({
          ...current,
          email: "This email is already registered",
        }));
      }

      if (message.toLowerCase().includes("phone")) {
        setFieldErrors((current) => ({ ...current, phone: message }));
      }

      if (message.toLowerCase().includes("bar id")) {
        setFieldErrors((current) => ({ ...current, barId: message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 2) return "bg-orange-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    if (passwordStrength <= 4) return "bg-lime-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (!password) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 2) return "Fair";
    if (passwordStrength <= 3) return "Good";
    if (passwordStrength <= 4) return "Strong";
    return "Very Strong";
  };

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-[#07111f]" />
      <main className="auth-page relative min-h-[100svh] bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.12),transparent_30%),linear-gradient(180deg,#07111f_0%,#0A1628_40%,var(--clr-surface)_100%)] px-4 pb-6 pt-1 sm:px-6 sm:pb-8 sm:pt-2 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-fit rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/70 hover:bg-white/20"
            >
              Back to Home
            </Link>
            <section className="card-elevated flex flex-col gap-4 rounded-2xl p-4 backdrop-blur-xl sm:p-5 lg:sticky lg:top-3 mt-2">
              <div>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-secondary">
                  Islam & Associates
                </p>
                <p className="mt-2 font-display text-xl font-bold leading-snug text-on-surface sm:text-2xl">
                  Create your account and verify your email.
                </p>
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  Choose your role, fill in your details, and we&apos;ll send a
                  verification code before activating your account.
                </p>
              </div>

              <div className="grid gap-3 rounded-xl border border-outline-variant/60 bg-surface-container/80 p-4">
                {[
                  { step: "01", text: "Enter your profile details." },
                  { step: "02", text: "Receive a verification code by email." },
                  { step: "03", text: "Verify and access your dashboard." },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-secondary">
                      {step}
                    </span>
                    <p className="text-xs text-on-surface-variant">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="card-elevated rounded-2xl p-3.5 backdrop-blur-xl sm:p-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container p-3.5 sm:p-4">
              <div className="mb-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                  Create Account
                </p>
                <p className="mt-1 font-display text-xl font-bold text-on-surface sm:text-2xl">
                  Register securely
                </p>
              </div>

              <div className="mb-1 flex gap-1 rounded-xl bg-surface-dim p-1">
                {(["client", "lawyer"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setError(null);
                      setBarId("");
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      role === r
                        ? "bg-primary text-on-primary shadow-md shadow-primary/20"
                        : "text-on-surface-variant hover:bg-surface-bright"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-[0.65rem] text-on-surface-variant">
                Lawyer registration requires a valid Bar ID.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
                  {error}
                </div>
              )}

              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[0.7rem] font-medium text-on-surface-variant sm:col-span-2">
                    Full Name
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError("name");
                      }}
                      className={`mt-1.5 block w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.name ? "border-error" : "border-outline"}`}
                      placeholder="John Doe"
                      disabled={isSubmitting}
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-error">
                        {fieldErrors.name}
                      </p>
                    )}
                  </label>

                  <label className="block text-[0.7rem] font-medium text-on-surface-variant sm:col-span-2">
                    Email Address
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      className={`mt-1.5 block w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.email ? "border-error" : "border-outline"}`}
                      placeholder="john@example.com"
                      disabled={isSubmitting}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-error">
                        {fieldErrors.email}
                      </p>
                    )}
                  </label>

                  <label className="block text-[0.7rem] font-medium text-on-surface-variant">
                    Password
                    <div className="relative mt-1.5">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          handlePasswordChange(e);
                          clearFieldError("password");
                        }}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        className={`block w-full rounded-lg border bg-surface px-3 py-2.5 pr-10 text-sm text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.password ? "border-error" : "border-outline"}`}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((c) => !c)}
                        className="absolute inset-y-0 right-2.5 flex items-center text-on-surface-variant transition hover:text-primary"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {password && isPasswordFocused && (
                      <div className="mt-2 space-y-1.5 rounded-lg border border-outline-variant/60 bg-surface/70 p-3">
                        <div className="flex h-1.5 gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-colors ${i < passwordStrength ? getPasswordStrengthColor() : "bg-outline-variant"}`}
                            />
                          ))}
                        </div>
                        <p className="text-[0.65rem] text-on-surface-variant">
                          Strength:{" "}
                          <span className="font-semibold">
                            {getPasswordStrengthText()}
                          </span>
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                          <p className="text-[0.65rem] text-on-surface-variant">
                            • 8+ chars {password.length >= 8 ? "✓" : ""}
                          </p>
                          <p className="text-[0.65rem] text-on-surface-variant">
                            • Upper & lower{" "}
                            {/[a-z]/.test(password) && /[A-Z]/.test(password)
                              ? "✓"
                              : ""}
                          </p>
                          <p className="text-[0.65rem] text-on-surface-variant">
                            • Number {/\d/.test(password) ? "✓" : ""}
                          </p>
                          <p className="text-[0.65rem] text-on-surface-variant">
                            • Special char {/@$!%*?&/.test(password) ? "✓" : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-error">
                        {fieldErrors.password}
                      </p>
                    )}
                  </label>

                  <label className="block text-[0.7rem] font-medium text-on-surface-variant">
                    Confirm Password
                    <div className="relative mt-1.5">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearFieldError("confirmPassword");
                        }}
                        className={`block w-full rounded-lg border bg-surface px-3 py-2.5 pr-10 text-sm text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.confirmPassword ? "border-error" : "border-outline"}`}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((c) => !c)}
                        className="absolute inset-y-0 right-2.5 flex items-center text-on-surface-variant transition hover:text-primary"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-error">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </label>

                  <label className="block text-[0.7rem] font-medium text-on-surface-variant sm:col-span-2">
                    Phone Number <span className="text-error">*</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError("phone");
                      }}
                      required
                      className={`mt-1.5 block w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.phone ? "border-error" : "border-outline"}`}
                      placeholder="+8801XXXXXXXXX"
                      disabled={isSubmitting}
                    />
                    {fieldErrors.phone ? (
                      <p className="mt-1 text-xs text-error">
                        {fieldErrors.phone}
                      </p>
                    ) : (
                      <p className="mt-1 text-[0.65rem] text-on-surface-variant">
                        Valid Bangladeshi number, e.g. +8801712345678
                      </p>
                    )}
                  </label>

                  {role === "lawyer" && (
                    <label className="block text-[0.7rem] font-medium text-on-surface-variant sm:col-span-2">
                      Bar ID <span className="text-error">*</span>
                      <input
                        type="text"
                        value={barId}
                        onChange={(e) => {
                          setBarId(e.target.value);
                          clearFieldError("barId");
                        }}
                        className={`mt-1.5 block w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.barId ? "border-error" : "border-outline"}`}
                        placeholder="Your bar registration number"
                        disabled={isSubmitting}
                      />
                      {fieldErrors.barId && (
                        <p className="mt-1 text-xs text-error">
                          {fieldErrors.barId}
                        </p>
                      )}
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:opacity-95 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>

                <p className="text-center text-xs text-on-surface-variant">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-secondary underline decoration-2 underline-offset-4 hover:text-primary"
                  >
                    Sign in here
                  </Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
