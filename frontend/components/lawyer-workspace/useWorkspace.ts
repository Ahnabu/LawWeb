"use client";

import { useMemo } from "react";
import { useAuth } from "../AuthProvider";
import { can } from "../../lib/access";
import type { WorkspaceLawyerId } from "../../lib/workspace";

// The lawyer whose work a workspace component shows, and what the signed-in
// account may do there. 'me' is the lawyer themselves (they may do everything);
// a lawyer id is a staff member working for that lawyer. UI hint only; the
// backend enforces the same permissions.
export function useWorkspace(lawyerId: WorkspaceLawyerId) {
  const { user } = useAuth();
  return useMemo(() => {
    const isOwn = lawyerId === "me";
    const id = isOwn ? user?._id : lawyerId;
    const delegation = isOwn ? undefined : user?.access?.delegations.find((d) => d.lawyerId === lawyerId);
    return {
      isOwn,
      lawyerId: id,
      lawyerName: isOwn ? user?.name : delegation?.lawyerName,
      can: (perm: string) => can(user, perm, id),
    };
  }, [user, lawyerId]);
}
