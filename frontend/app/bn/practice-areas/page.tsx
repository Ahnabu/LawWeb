import { pageMetadata } from '../../../lib/seo'

// Bangla URL for /practice-areas: same page; the LanguageProvider reads the locale from the path
export { default } from '../../practice-areas/page'
export const generateMetadata = pageMetadata('practiceAreas', 'bn')
