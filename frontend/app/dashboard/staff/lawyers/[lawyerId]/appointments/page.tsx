"use client";

import { useParams } from "next/navigation";
import { WorkspaceAppointments } from "../../../../../../components/lawyer-workspace/WorkspaceAppointments";

export default function StaffLawyerAppointmentsPage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  return <WorkspaceAppointments lawyerId={lawyerId} />;
}
