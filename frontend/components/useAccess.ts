"use client";

import { useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { can, canAny, isSuperAdmin } from "../lib/access";

// Permission checks for the signed-in account. UI hint only; the backend enforces.
export function useAccess() {
  const { user } = useAuth();
  return useMemo(
    () => ({
      can: (perm: string, lawyerId?: string) => can(user, perm, lawyerId),
      canAny: (perms: readonly string[], lawyerId?: string) => canAny(user, perms, lawyerId),
      isSuperAdmin: isSuperAdmin(user),
      isStaff: user?.role === "staff",
    }),
    [user],
  );
}
