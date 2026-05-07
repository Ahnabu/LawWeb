import DashboardLayoutWrapper from "../layout-wrapper";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayoutWrapper role="client">{children}</DashboardLayoutWrapper>
  );
}
