import { singleLanguagePageMetadata } from '../../lib/seo'

export const generateMetadata = singleLanguagePageMetadata('lawyers')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
