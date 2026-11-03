import { describe, expect, it } from 'vitest'
import { countryOptions, phoneProblem, toE164 } from '../lib/phone'

// Phone numbers with a country calling code (lib/phone.ts). The sign-up form
// sends one E.164 number, whatever country the visitor picked.

describe('countryOptions', () => {
  it('offers every country with its calling code', () => {
    expect(countryOptions.length).toBeGreaterThan(200)
    const bangladesh = countryOptions.find((c) => c.code === 'BD')
    expect(bangladesh?.dialCode).toBe('+880')
    const usa = countryOptions.find((c) => c.code === 'US')
    expect(usa?.dialCode).toBe('+1')
    const uk = countryOptions.find((c) => c.code === 'GB')
    expect(uk?.dialCode).toBe('+44')
  })

  it('gives every country a name and a plus-prefixed code', () => {
    expect(countryOptions.every((c) => c.name.length > 0 && c.dialCode.startsWith('+'))).toBe(true)
  })
})

describe('toE164', () => {
  it('joins the country code with the national number', () => {
    expect(toE164('+880', '1712345678')).toBe('+8801712345678')
    expect(toE164('+1', '2025550143')).toBe('+12025550143')
  })

  it('drops the spaces and dashes a visitor types', () => {
    expect(toE164('+44', '20 7946 0958')).toBe('+442079460958')
  })
})

describe('phoneProblem', () => {
  it('accepts a well-formed international number', () => {
    expect(phoneProblem('+8801712345678')).toBeNull()
    expect(phoneProblem('+12025550143')).toBeNull()
    expect(phoneProblem('+442079460958')).toBeNull()
  })

  it('refuses a number without a country code', () => {
    expect(phoneProblem('01712345678')).toMatch(/international format/)
    expect(phoneProblem('1712345678')).toMatch(/international format/)
  })

  it('refuses an empty number', () => {
    expect(phoneProblem('')).toBe('Phone number is required')
    expect(phoneProblem('   ')).toBe('Phone number is required')
  })

  it('refuses letters and short or long numbers', () => {
    expect(phoneProblem('+88017abc45678')).toMatch(/digits/)
    expect(phoneProblem('+1234')).toMatch(/valid phone number/)
    expect(phoneProblem(`+${'1'.repeat(16)}`)).toMatch(/valid phone number/)
  })

  it('refuses a calling code the ITU never assigned', () => {
    // 888 is not a country calling code
    expect(phoneProblem('+88812345678')).toMatch(/not one we recognise/)
    // 880 (Bangladesh) is valid, 88 alone is not
    expect(phoneProblem('+8801712345678')).toBeNull()
  })
})
