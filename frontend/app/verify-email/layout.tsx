import { noIndexMetadata } from '../../lib/seo'

// Account page: nothing for search results
export const metadata = noIndexMetadata('Verify Email')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
