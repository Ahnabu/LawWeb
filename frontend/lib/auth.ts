export type UserRole = "admin" | "lawyer" | "client";

interface AuthError extends Error {
  verificationRequired?: boolean;
  email?: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  barId?: string;
  phone?: string;
  profileImageUrl?: string;
  isVerified?: boolean;
  passwordNeedsChange?: boolean;
}

interface LoginResponse {
  message: string;
  user: AuthUser;
  accessTokenExpiresAt?: number;
}

interface RegisterResponse {
  message: string;
  verificationRequired: true;
  email: string;
}

interface VerificationResponse {
  message: string;
  user: AuthUser;
  accessTokenExpiresAt?: number;
}

import { API_BASE_URL } from "./api";
import { apiFetch, broadcastAuth, setAccessTokenExpiry } from "./http";

const USER_ROLES: UserRole[] = ["admin", "lawyer", "client"];

export const dashboardPathFor = (role: UserRole) => `/dashboard/${role}`;

// Only same-site relative paths ("/appointment"), never "//evil.com" or "https://…",
// so a crafted ?redirect= link cannot send a freshly logged-in user off-site.
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }
  return path;
}

// Where to go after login: the saved redirect unless it points at another
// role's dashboard (which would only bounce), otherwise the user's own dashboard.
export function postLoginPath(role: UserRole, redirect: string | null | undefined): string {
  const safe = safeRedirectPath(redirect);
  if (!safe) return dashboardPathFor(role);

  const match = safe.match(/^\/dashboard\/([^/?#]+)/);
  if (match && match[1] !== role) return dashboardPathFor(role);

  return safe;
}

export function readRoleCookie(): UserRole | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)userRole=([^;]+)/);
  const role = match ? decodeURIComponent(match[1]) : null;
  return role && USER_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

// Non-httpOnly hint cookie read by middleware.ts for routing only. The backend
// never trusts it; real authorization comes from the httpOnly token cookies.
export function setRoleCookie(role: UserRole | null) {
  if (typeof document === "undefined") return;
  if (role && USER_ROLES.includes(role)) {
    document.cookie = `userRole=${role}; path=/; max-age=604800; samesite=lax`;
  } else {
    document.cookie = "userRole=; path=/; max-age=0; samesite=lax";
  }
}

const readJson = (response: Response) => response.json().catch(() => ({}));

// Uses the backend's field-level validation message when there is one
const errorMessage = (data: { message?: string; errors?: { message?: string }[] }, fallback: string) =>
  data.errors?.[0]?.message || data.message || fallback;

export async function signIn(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    const error: AuthError = new Error(errorMessage(data, "Login failed"));
    error.verificationRequired = data.verificationRequired;
    error.email = data.email;
    throw error;
  }

  setAccessTokenExpiry(data.accessTokenExpiresAt);
  setRoleCookie(data.user.role);

  return data as LoginResponse;
}

export async function fetchSession(): Promise<AuthUser | null> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/profile`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  return data?.user ?? null;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  role: "lawyer" | "client" = "client",
  phone: string,
  barId?: string,
): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      name,
      email,
      password,
      role,
      phone,
      barId,
    }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, "Registration failed"));
  }

  return data as RegisterResponse;
}

export async function verifyEmail(
  email: string,
  code: string,
): Promise<VerificationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, "Verification failed"));
  }

  setAccessTokenExpiry(data.accessTokenExpiresAt);
  setRoleCookie(data.user.role);

  return data as VerificationResponse;
}

export async function resendVerificationCode(
  email: string,
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/resend-verification-code`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email }),
    },
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to resend verification code"));
  }

  return data as { message: string };
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to send the reset email"));
  }

  return data as { message: string };
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, password }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to reset the password"));
  }

  // Every session was revoked server-side, including any open in other tabs
  setAccessTokenExpiry(null);
  setRoleCookie(null);
  broadcastAuth({ type: "signed-out" });

  return data as { message: string };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string; user: AuthUser }> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, "Failed to change password"));
  }

  setAccessTokenExpiry(data.accessTokenExpiresAt);

  return data as { message: string; user: AuthUser };
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    setAccessTokenExpiry(null);
    setRoleCookie(null);
  }
}

// Mirrors the backend passwordSchema so users see problems before submitting
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password must be at most 72 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z\d]/.test(password)) {
    return "Password must contain uppercase, lowercase, number and special character.";
  }
  return null;
}
