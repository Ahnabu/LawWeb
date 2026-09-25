import { pageMetadata } from '../../lib/seo'

// Home only (the group keeps these tags off every other route)
export const generateMetadata = pageMetadata('home')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
