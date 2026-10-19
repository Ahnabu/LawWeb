"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { safeRedirectPath, signUp } from "../../lib/auth";
import { AuthShell } from "../../components/AuthShell";

const signUpSteps = [
  "Enter your profile details.",
  "Receive a verification code by email.",
  "Verify and access your dashboard.",
];

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role] = useState<"client" | "lawyer">("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [barId] = useState("");
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
  const redirectPath = safeRedirectPath(searchParams.get("redirect"));

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
      }
      router.push(
        `/verify-email?email=${encodeURIComponent(normalizedEmail)}${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ""}`,
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

  const fieldClass = (invalid?: string) => `field${invalid ? " field-invalid" : ""}`;

  // Shown in the desktop brand panel; inline above the form on phones
  const brandAside = (
    <>
      <ol className="mt-8 space-y-3">
        {signUpSteps.map((text, index) => (
          <li key={text} className="flex items-start gap-3 text-sm leading-6 text-white/80">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-secondary/60 text-xs font-semibold text-secondary">
              {index + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      <p className="mt-8 border-l-2 border-secondary/60 pl-4 text-sm leading-6 text-white/70">
        This creates a client account. Lawyer accounts are managed by the
        firm; contact us to join as a lawyer.
      </p>
    </>
  );

  return (
    <AuthShell backHref="/" backLabel="Back to Home" wide aside={brandAside}>
      <h1 className="text-2xl text-heading sm:text-[1.75rem]">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        We&apos;ll email you a verification code to activate your account.
      </p>

      <div className="lg:hidden">
        <ol className="mt-5 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-3 sm:gap-4">
          {signUpSteps.map((text, index) => (
            <li key={text} className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-outline text-[0.7rem] font-semibold text-on-surface">
                {index + 1}
              </span>
              <span className="leading-5">{text}</span>
            </li>
          ))}
        </ol>

        <hr className="rule my-6" />

        <div className="notice notice-info mb-5">
          <p className="font-semibold">Client Account</p>
          <p className="mt-0.5 text-on-surface-variant">
            Lawyer accounts are managed by the firm. Contact us to join as
            a lawyer.
          </p>
        </div>
      </div>

      {error && (
        <div className="notice notice-error mb-5" role="alert">
          {error}
        </div>
      )}

      <form className="space-y-4 lg:mt-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-y-3">
          <label className="block">
            <span className="label">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              className={fieldClass(fieldErrors.name)}
              placeholder="John Doe"
              disabled={isSubmitting}
              autoComplete="name"
            />
            {fieldErrors.name && <p className="error-text">{fieldErrors.name}</p>}
          </label>

          <label className="block">
            <span className="label">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              className={fieldClass(fieldErrors.email)}
              placeholder="john@example.com"
              disabled={isSubmitting}
              autoComplete="email"
            />
            {fieldErrors.email && <p className="error-text">{fieldErrors.email}</p>}
          </label>

          <div className="relative">
            <label htmlFor="register-password" className="label">Password</label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  handlePasswordChange(e);
                  clearFieldError("password");
                }}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                className={`${fieldClass(fieldErrors.password)} pr-12`}
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
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
              <div className="card absolute inset-x-0 top-full z-20 mt-1.5 space-y-1.5 p-3 shadow-xl">
                <div className="flex h-1.5 gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${i < passwordStrength ? getPasswordStrengthColor() : "bg-outline-variant"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant">
                  Strength:{" "}
                  <span className="font-semibold">
                    {getPasswordStrengthText()}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-on-surface-variant">
                  <p>• 8+ chars {password.length >= 8 ? "✓" : ""}</p>
                  <p>
                    • Upper & lower{" "}
                    {/[a-z]/.test(password) && /[A-Z]/.test(password)
                      ? "✓"
                      : ""}
                  </p>
                  <p>• Number {/\d/.test(password) ? "✓" : ""}</p>
                  <p>• Special char {/@$!%*?&/.test(password) ? "✓" : ""}</p>
                </div>
              </div>
            )}
            {fieldErrors.password && <p className="error-text">{fieldErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="register-password-confirm" className="label">Confirm Password</label>
            <div className="relative">
              <input
                id="register-password-confirm"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                className={`${fieldClass(fieldErrors.confirmPassword)} pr-12`}
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((c) => !c)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
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
            {fieldErrors.confirmPassword && <p className="error-text">{fieldErrors.confirmPassword}</p>}
          </div>

          <label className="block sm:col-span-2">
            <span className="label">
              Phone Number <span className="text-error">*</span>
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError("phone");
              }}
              required
              className={fieldClass(fieldErrors.phone)}
              placeholder="+8801XXXXXXXXX"
              disabled={isSubmitting}
              autoComplete="tel"
            />
            {fieldErrors.phone ? (
              <p className="error-text">{fieldErrors.phone}</p>
            ) : (
              <p className="hint lg:hidden">Valid Bangladeshi number, e.g. +8801712345678</p>
            )}
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg btn-block"
        >
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-center text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-link">
            Sign in here
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
