import { pageMetadata } from '../../lib/seo'

export const generateMetadata = pageMetadata('blogs')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
