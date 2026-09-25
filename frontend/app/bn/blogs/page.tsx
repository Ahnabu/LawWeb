import { pageMetadata } from '../../../lib/seo'

// Bangla URL for /blogs: same page; the LanguageProvider reads the locale from the path
export { default } from '../../blogs/page'
export const generateMetadata = pageMetadata('blogs', 'bn')
