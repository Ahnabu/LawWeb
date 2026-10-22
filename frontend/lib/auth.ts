import type { UserAccess } from "./access";

export type UserRole = "admin" | "lawyer" | "client" | "staff";

export interface AuthError extends Error {
  verificationRequired?: boolean;
  email?: string;
  /** Server error code, e.g. "ACCOUNT_BLOCKED" */
  code?: string;
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
  /** What the account may do (UI hints only; the backend enforces) */
  access?: UserAccess;
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

export const dashboardPathFor = (role: UserRole) => `/dashboard/${role}`;

// Only same-site relative paths ("/appointment"), never "//evil.com" or "https://…",
// so a crafted ?redirect= link cannot send a freshly logged-in user off-site.
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }
  return path;
}

// Dashboards each account type may open. Staff work in the admin pages their
// role allows (each page then checks the permission itself).
const DASHBOARDS_BY_ROLE: Record<UserRole, readonly string[]> = {
  admin: ["admin"],
  lawyer: ["lawyer"],
  client: ["client"],
  staff: ["staff", "admin"],
};

// Where to go after login: the saved redirect unless it points at another
// role's dashboard (which would only bounce), otherwise the user's own dashboard.
export function postLoginPath(role: UserRole, redirect: string | null | undefined): string {
  const safe = safeRedirectPath(redirect);
  if (!safe) return dashboardPathFor(role);

  const match = safe.match(/^\/dashboard\/([^/?#]+)/);
  if (match && !DASHBOARDS_BY_ROLE[role]?.includes(match[1])) return dashboardPathFor(role);

  return safe;
}

// Name and value are mirrored in middleware.ts
const SESSION_HINT_COOKIE = "signedIn";

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  // A legacy userRole cookie counts once so existing sessions are not dropped;
  // the session check that follows replaces it (setSessionHint)
  return /(?:^|;\s*)(?:signedIn=1|userRole=[^;]+)/.test(document.cookie);
}

// Non-httpOnly hint cookie: "this browser has signed in", read by middleware.ts
// and AuthProvider. It deliberately carries no role or id. The backend never
// trusts it; real authorization comes from the httpOnly token cookies, and the
// role used for routing comes from the verified /api/auth/profile response.
export function setSessionHint(signedIn: boolean) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = signedIn
    ? `${SESSION_HINT_COOKIE}=1; path=/; max-age=604800; samesite=lax${secure}`
    : `${SESSION_HINT_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
  // Older builds stored the role in plain text here
  document.cookie = "userRole=; path=/; max-age=0; samesite=lax";
}

// /api/auth/profile failed for a reason that says nothing about the session
// (backend down, cold-start 503, network error)
export class SessionCheckError extends Error {}

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
    error.code = data.code;
    throw error;
  }

  setAccessTokenExpiry(data.accessTokenExpiresAt);
  setSessionHint(true);

  return data as LoginResponse;
}

// null = signed out (401, or 403 for a blocked account). Any other failure
// throws SessionCheckError so callers do not sign the user out over an outage.
export async function fetchSession(): Promise<AuthUser | null> {
  let response: Response;
  try {
    response = await apiFetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new SessionCheckError("Unable to reach the server");
  }

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new SessionCheckError(`Session check failed (${response.status})`);
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
  setSessionHint(true);

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
  setSessionHint(false);
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
    setSessionHint(false);
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
