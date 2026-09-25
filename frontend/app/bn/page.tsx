import { pageMetadata } from '../../lib/seo'

// Bangla URL for /: same page; the LanguageProvider reads the locale from the path
export { default } from '../(home)/page'
export const generateMetadata = pageMetadata('home', 'bn')
