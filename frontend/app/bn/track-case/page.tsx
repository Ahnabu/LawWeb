import { pageMetadata } from '../../../lib/seo'

// Bangla URL for /track-case: same page; the LanguageProvider reads the locale from the path
export { default } from '../../track-case/page'
export const generateMetadata = pageMetadata('trackCase', 'bn')
