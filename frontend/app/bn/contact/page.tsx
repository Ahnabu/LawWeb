import { pageMetadata } from '../../../lib/seo'

// Bangla URL for /contact: same page; the LanguageProvider reads the locale from the path
export { default } from '../../contact/page'
export const generateMetadata = pageMetadata('contact', 'bn')
