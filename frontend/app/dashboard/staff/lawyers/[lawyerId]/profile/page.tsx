"use client";

import { useParams } from "next/navigation";
import { WorkspaceProfile } from "../../../../../../components/lawyer-workspace/WorkspaceProfile";

export default function StaffLawyerProfilePage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  return <WorkspaceProfile lawyerId={lawyerId} />;
}
