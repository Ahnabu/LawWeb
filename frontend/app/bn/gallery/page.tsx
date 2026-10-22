import { pageMetadata } from '../../../lib/seo'

// Bangla URL for /gallery: same page; the LanguageProvider reads the locale from the path
export { default } from '../../gallery/page'
export const generateMetadata = pageMetadata('gallery', 'bn')
