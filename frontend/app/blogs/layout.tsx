import { getPageMetadata } from '../../lib/seo'

export const generateMetadata = () => getPageMetadata('blogs')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
