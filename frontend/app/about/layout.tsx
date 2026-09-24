import { getPageMetadata } from '../../lib/seo'

export const generateMetadata = () => getPageMetadata('about')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
