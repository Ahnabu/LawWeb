"use client";

import { useParams } from "next/navigation";
import { WorkspaceAvailability } from "../../../../../../components/lawyer-workspace/WorkspaceAvailability";

export default function StaffLawyerAvailabilityPage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  return <WorkspaceAvailability lawyerId={lawyerId} />;
}
