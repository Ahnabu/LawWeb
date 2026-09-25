import { pageMetadata } from '../../../lib/seo'

// Bangla URL for /about: same page; the LanguageProvider reads the locale from the path
export { default } from '../../about/page'
export const generateMetadata = pageMetadata('about', 'bn')
