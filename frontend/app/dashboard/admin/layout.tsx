import DashboardLayoutWrapper from "../layout-wrapper"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayoutWrapper role="admin">
      {children}
    </DashboardLayoutWrapper>
  )
}
