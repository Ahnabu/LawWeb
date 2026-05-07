import DashboardLayoutWrapper from "../layout-wrapper"

export default function LawyerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayoutWrapper role="lawyer">
      {children}
    </DashboardLayoutWrapper>
  )
}
