import { blogArticleMetadata } from '../../../../lib/seo'

// Bangla URL for /blogs/[slug]: same page; the LanguageProvider reads the locale from the path
export { default } from '../../../blogs/[slug]/page'
export const generateMetadata = blogArticleMetadata('bn')
