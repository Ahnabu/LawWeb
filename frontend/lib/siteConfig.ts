// Single source for firm contact details. Localized text (firm name, address,
// WhatsApp greeting) lives in i18n under `site.*`. The admin CMS "site" page
// overrides these values once published; these are the code defaults.
// Components should read them through useSiteSettings(), not directly.
import type { SiteSettingsOverride, SocialLink } from './content'

export const siteConfig = {
  phone: '+8801715365380',
  phoneDisplay: '+88-01715365380',
  fax: '+88-02-8052345',
  email: '',
  whatsappNumber: '8801715365380',
  socials: [] as SocialLink[],
}

export function whatsappUrl(message?: string, number: string = siteConfig.whatsappNumber) {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export function telUrl(phone: string = siteConfig.phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// Published "site" settings over the defaults above (client hook and server)
export function resolveSiteSettings(settings: SiteSettingsOverride = {}) {
  return {
    phone: settings.phone || siteConfig.phone,
    // A new phone without a display format shows as entered, not the old number
    phoneDisplay: settings.phoneDisplay || settings.phone || siteConfig.phoneDisplay,
    fax: settings.fax || siteConfig.fax,
    email: settings.email || siteConfig.email,
    whatsappNumber: settings.whatsappNumber || siteConfig.whatsappNumber,
    socials: settings.socials ?? siteConfig.socials,
  }
}
