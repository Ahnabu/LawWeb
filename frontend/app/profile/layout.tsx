import { noIndexMetadata } from '../../lib/seo'

// Account page: nothing for search results
export const metadata = noIndexMetadata('My Profile')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
