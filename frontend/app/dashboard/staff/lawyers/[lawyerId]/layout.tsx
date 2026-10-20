"use client";

import { useParams, usePathname } from "next/navigation";
import { useAuth } from "../../../../../components/AuthProvider";
import { NoAccessCard } from "../../../../../components/PermissionGate";
import { canAny } from "../../../../../lib/access";
import { parseStaffWorkspacePath, workspacePageFor } from "../../../../../components/lawyer-workspace/workspacePages";

// A lawyer's workspace for an assistant. Opens only for a lawyer they assist
// (an active delegation in their session), and each page needs its permission.
// The staff layout re-reads the session on every navigation, so a revoked
// delegation shows here on the next click. The API refuses the same requests.
export default function StaffLawyerWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  const pathname = usePathname() || "";
  const { user } = useAuth();

  const delegation = user?.access?.delegations.find((d) => d.lawyerId === lawyerId);
  if (!delegation) {
    return <NoAccessCard hint="You don't assist this lawyer, or your access has ended. Ask the lawyer or the firm administrator." />;
  }

  const page = workspacePageFor(parseStaffWorkspacePath(pathname)?.subPath ?? "");
  if (!page || !canAny(user, page.anyOf, lawyerId)) {
    return <NoAccessCard hint={`${delegation.lawyerName ?? "This lawyer"} hasn't given you access to this page.`} />;
  }
  return <>{children}</>;
}
