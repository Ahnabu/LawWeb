import { blogArticleMetadata } from '../../../lib/seo'

export const generateMetadata = blogArticleMetadata('en')

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
