import { z } from 'zod';

// ── CMS page registry ─────────────────────────────────────────────────────────
// Every admin-editable public page is one ContentPage document keyed by one of
// these values. Content is stored sparsely: anything absent falls back to the
// code defaults in frontend/lib/i18n.ts and frontend/lib/data.ts, so an empty
// page renders exactly like the current static site.
//
// Shape of every page's data:
//   strings — overrides for i18n keys, e.g. { 'about.heroTitle': { en, bn } }.
//             A missing or empty language falls back to that key's default.
//   <lists> — page-specific repeatable items. When present, the whole list
//             replaces the code default (lists are edited as a unit).
//
// Which i18n keys belong to which page is decided by the admin editor registry
// on the frontend; the backend only enforces the shape and size limits.

export const CONTENT_PAGE_KEYS = [
  'site',
  'global',
  'home',
  'about',
  'practice-areas',
  'track-case',
  'blogs',
] as const;

export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[number];

const SHORT_TEXT = 200;
const LONG_TEXT = 2000;
const MAX_STRING_OVERRIDES = 500;

const I18N_KEY = z
  .string()
  .max(120)
  .regex(/^[a-zA-Z][\w-]*(\.[\w-]+)+$/, 'Invalid translation key');

// Fingerprint (8 hex chars) of the English text a Bangla translation was
// written for. The admin editor compares it with the current English to flag
// Bangla that went stale after an English edit. Never read by the public site.
const bnFor = z.string().regex(/^[0-9a-f]{8}$/, 'Invalid translation fingerprint').optional();

// Override value: either language may be omitted/empty to keep its default.
const stringOverride = z.object({
  en: z.string().trim().max(LONG_TEXT).optional(),
  bn: z.string().trim().max(LONG_TEXT).optional(),
  bnFor,
});

const strings = z
  .record(I18N_KEY, stringOverride)
  .refine((value) => Object.keys(value).length <= MAX_STRING_OVERRIDES, {
    message: `At most ${MAX_STRING_OVERRIDES} text overrides per page`,
  });

// List item text: English is required, Bangla falls back to English when empty.
const localized = (max: number = SHORT_TEXT) =>
  z.object({
    en: z.string().trim().min(1, 'English text is required').max(max),
    bn: z.string().trim().max(max).default(''),
    bnFor,
  });

const slug = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^\+?[\d\s\-()]*$/, 'Invalid phone number');

// Uploaded image URL (Cloudinary). https only — it ends up in a CSS url()
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .url('Invalid image URL')
  .regex(/^https:\/\/[^\s"'()\\]+$/i, 'Image URL must start with https://');

const siteSchema = z
  .object({
    strings: strings.optional(),
    settings: z
      .object({
        phone: phone.optional(),
        phoneDisplay: z.string().trim().max(40).optional(),
        fax: phone.optional(),
        email: z.string().trim().email('Invalid email format').or(z.literal('')).optional(),
        whatsappNumber: z
          .string()
          .trim()
          .regex(/^\d{8,15}$/, 'WhatsApp number must be digits only, with country code (e.g. 8801XXXXXXXXX)')
          .optional(),
        socials: z
          .array(
            z.object({
              platform: z.enum(['facebook', 'linkedin', 'youtube', 'x', 'instagram']),
              // http(s) only — .url() alone accepts javascript: URLs, which would be an XSS vector in href
              url: z
                .string()
                .trim()
                .max(300)
                .url('Invalid URL')
                .regex(/^https?:\/\//i, 'URL must start with http:// or https://'),
            })
          )
          .max(10)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const stringsOnlySchema = z.object({ strings: strings.optional() }).strict();

const homeSchema = z
  .object({
    strings: strings.optional(),
    heroImage: imageUrl.optional(),
    stats: z
      .array(z.object({ value: localized(60), label: localized(60) }))
      .max(8)
      .optional(),
    successStories: z
      .array(
        z.object({
          title: localized(),
          summary: localized(LONG_TEXT),
          quote: localized(LONG_TEXT),
          badge: localized(60),
          initials: z.string().trim().max(10).default(''),
        })
      )
      .max(12)
      .optional(),
  })
  .strict();

const aboutSchema = z
  .object({
    strings: strings.optional(),
    certifications: z.array(localized()).max(20).optional(),
    timeline: z
      .array(
        z.object({
          year: localized(60),
          title: localized(),
          description: localized(LONG_TEXT),
        })
      )
      .max(20)
      .optional(),
    credentials: z.array(localized()).max(20).optional(),
    values: z
      .array(z.object({ title: localized(), description: localized(LONG_TEXT) }))
      .max(10)
      .optional(),
  })
  .strict();

const practiceAreasSchema = z
  .object({
    strings: strings.optional(),
    areas: z
      .array(
        z.object({
          slug,
          title: localized(),
          description: localized(),
          details: localized(LONG_TEXT),
        })
      )
      .max(30)
      .refine((areas) => new Set(areas.map((a) => a.slug)).size === areas.length, {
        message: 'Practice area slugs must be unique',
      })
      .optional(),
  })
  .strict();

export const contentPageSchemas: Record<ContentPageKey, z.ZodType<Record<string, unknown>>> = {
  site: siteSchema,
  global: stringsOnlySchema,
  home: homeSchema,
  about: aboutSchema,
  'practice-areas': practiceAreasSchema,
  'track-case': stringsOnlySchema,
  blogs: stringsOnlySchema,
};

export const isContentPageKey = (value: string): value is ContentPageKey =>
  (CONTENT_PAGE_KEYS as readonly string[]).includes(value);
