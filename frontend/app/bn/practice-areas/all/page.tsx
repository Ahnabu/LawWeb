import { pageMetadata } from '../../../../lib/seo'

// Bangla URL for /practice-areas/all: same page; the LanguageProvider reads the locale from the path
export { default } from '../../../practice-areas/all/page'
export const generateMetadata = pageMetadata('practiceAreasAll', 'bn')
