import { getPageMetadata } from '../../lib/seo'

export const generateMetadata = () => getPageMetadata('practiceAreas')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
