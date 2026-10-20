import DashboardLayoutWrapper from "../layout-wrapper"

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayoutWrapper role="staff">
      {children}
    </DashboardLayoutWrapper>
  )
}
