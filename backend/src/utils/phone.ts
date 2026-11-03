/*
  Phone numbers with a country calling code.

  The sign-up form lets a visitor pick their country, so the stored number is
  always E.164 ("+8801712345678"): a plus, the country calling code and the
  national number. A number without a country is ambiguous, so it is refused.

  The rules are deliberately loose about *which* national number belongs to the
  chosen country (many countries have several valid prefixes and lengths), but
  strict about the shape:

  - "+" then 8 to 15 digits (E.164 allows 15 digits max, including the code)
  - the calling code must be one the ITU assigned
  - the national part must not start with 0

  The calling codes come from libphonenumber-js, the same ITU list the browser's
  country dropdown uses (frontend/lib/phone.ts), so the two can never drift
  apart. The backend is the authority.
*/

import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

// Every calling code the ITU assigned, taken from libphonenumber-js.
const CALLING_CODES = new Set<string>(
  getCountries().map((country) => String(getCountryCallingCode(country))),
);

export const MAX_E164_DIGITS = 15;
const MIN_E164_DIGITS = 8;

/** True when the string is a plus, then 8 to 15 digits starting with 1-9. */
const E164_SHAPE = /^\+[1-9]\d{7,14}$/;

/**
 * The calling code of an E.164 number, or null when it is not one we know.
 * Longest match first, so +880 is never read as +88 and +1 never shadows a
 * longer code.
 */
export const callingCodeOf = (value: string): string | null => {
  const digits = value.replace(/^\+/, '');
  if (!digits) return null;
  for (let length = 3; length >= 1; length -= 1) {
    const candidate = digits.slice(0, length);
    if (CALLING_CODES.has(candidate)) return candidate;
  }
  return null;
};

/**
 * Checks an E.164 number. Returns null when it is fine, otherwise the message
 * the form shows.
 */
export const phoneProblem = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return 'Phone number is required';
  if (!trimmed.startsWith('+')) {
    return 'Enter the number in international format, starting with the country code (for example +8801712345678)';
  }
  const digits = trimmed.slice(1);
  if (!/^\d+$/.test(digits)) return 'The phone number may only contain digits after the country code';
  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) {
    return 'Enter a valid phone number with its country code';
  }
  if (!CALLING_CODES.has(callingCodeOf(trimmed) ?? '')) {
    return 'That country code is not one we recognise';
  }
  return null;
};

/** True when the number is a well-formed E.164 number with a known calling code. */
export const isValidE164 = (value: string): boolean => phoneProblem(value) === null;

/**
 * Normalises a number to E.164 (digits only after the plus). Callers must run
 * phoneProblem first; this only tidies the formatting.
 */
export const toE164 = (value: string): string => `+${value.trim().replace(/^\+/, '').replace(/\D/g, '')}`;
