"use client";

import { useParams } from "next/navigation";
import { WorkspaceCases } from "../../../../../../components/lawyer-workspace/WorkspaceCases";
import { staffWorkspaceBase } from "../../../../../../components/lawyer-workspace/workspacePages";

export default function StaffLawyerCasesPage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  return <WorkspaceCases lawyerId={lawyerId} basePath={staffWorkspaceBase(lawyerId)} />;
}
