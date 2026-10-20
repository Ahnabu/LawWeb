"use client";

import { useParams } from "next/navigation";
import { WorkspaceOverview } from "../../../../../components/lawyer-workspace/WorkspaceOverview";

export default function StaffLawyerOverviewPage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  return <WorkspaceOverview lawyerId={lawyerId} />;
}
