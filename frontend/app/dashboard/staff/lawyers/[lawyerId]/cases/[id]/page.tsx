"use client";

import { useParams } from "next/navigation";
import { WorkspaceCaseDetail } from "../../../../../../../components/lawyer-workspace/WorkspaceCaseDetail";

export default function StaffLawyerCaseDetailPage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  return <WorkspaceCaseDetail lawyerId={lawyerId} />;
}
