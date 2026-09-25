import type { MetadataRoute } from 'next'
import { getSiteUrl } from '../lib/locale'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/profile', '/api/'] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
