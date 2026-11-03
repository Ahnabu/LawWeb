/*
  Phone numbers with a country calling code.

  The sign-up form lets a visitor pick their country, so the stored number is
  always E.164 ("+8801712345678"): a plus, the country calling code and the
  national number. The country list comes from libphonenumber-js (the same
  ITU list the backend checks against), so the dropdown and the server agree.
*/

import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

export type { CountryCode };

const MAX_E164_DIGITS = 15;
const MIN_E164_DIGITS = 8;

/** A country the visitor can pick, with its calling code and display name. */
export interface CountryOption {
  code: CountryCode;
  name: string;
  callingCode: string;
  /** The same as callingCode, with a plus: "+880" */
  dialCode: string;
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

// Every calling code the ITU assigned, so a number the browser accepts is
// never refused by the backend.
const CALLING_CODES = new Set<string>(
  getCountries().map((code) => String(getCountryCallingCode(code))),
);

/** The name of a country, falling back to its code when Intl has no name. */
export function countryName(code: CountryCode): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

// Every country libphonenumber-js knows, sorted by name.
const ALL_COUNTRIES: CountryOption[] = getCountries()
  .map((code) => {
    const callingCode = String(getCountryCallingCode(code));
    return { code, name: countryName(code), callingCode, dialCode: `+${callingCode}` };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// The countries most of this firm's visitors come from, at the top of the list.
const COMMON_FIRST = ["BD", "US", "GB", "AE", "IN", "SA", "MY", "CA", "AU", "QA", "SG", "NP"];

const COMMON_COUNTRIES: CountryOption[] = COMMON_FIRST.map((code) =>
  ALL_COUNTRIES.find((option) => option.code === code),
).filter((option): option is CountryOption => Boolean(option));

const OTHER_COUNTRIES = ALL_COUNTRIES.filter(
  (option) => !COMMON_FIRST.includes(option.code),
);

/** The full list, with the common countries first. */
export const countryOptions: CountryOption[] = [...COMMON_COUNTRIES, ...OTHER_COUNTRIES];

/** The country a code belongs to, or undefined when the code is unknown. */
export function countryOption(code: string): CountryOption | undefined {
  return countryOptions.find((option) => option.code === code);
}

/** The calling code of a country, as a string ("880"). */
export const callingCodeOf = (code: CountryCode): string => String(getCountryCallingCode(code));

/** Joins a calling code and a national number into E.164. */
export const toE164 = (dialCode: string, nationalNumber: string): string =>
  `${dialCode}${nationalNumber.replace(/\D/g, '')}`;

/**
 * Checks an E.164 number. Returns null when it is fine, otherwise the message
 * the form shows. The same rules run on the backend.
 */
export function phoneProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Phone number is required";
  if (!trimmed.startsWith("+")) {
    return "Enter the number in international format, starting with the country code (for example +8801712345678)";
  }
  const digits = trimmed.slice(1);
  if (!/^\d+$/.test(digits)) return "The phone number may only contain digits after the country code";
  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) {
    return "Enter a valid phone number with its country code";
  }
  if (!CALLING_CODES.has(callingCodeOfNumber(trimmed) ?? "")) {
    return "That country code is not one we recognise";
  }
  return null;
}

/** The calling code of an E.164 number, longest match first. */
function callingCodeOfNumber(value: string): string | null {
  const digits = value.replace(/^\+/, "");
  for (let length = 3; length >= 1; length -= 1) {
    const candidate = digits.slice(0, length);
    if (CALLING_CODES.has(candidate)) return candidate;
  }
  return null;
}
