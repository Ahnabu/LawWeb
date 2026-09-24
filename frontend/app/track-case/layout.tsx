import { getPageMetadata } from '../../lib/seo'

export const generateMetadata = () => getPageMetadata('trackCase')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
