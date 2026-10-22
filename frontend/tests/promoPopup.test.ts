import { describe, expect, it } from 'vitest'
import { lookupTranslation } from '../lib/i18n'
import {
  POPUP_FIRST_DELAY_MS,
  POPUP_MAX_SHOWS_PER_SESSION,
  POPUP_QUESTION_KEYS,
  POPUP_RESHOW_AFTER_MS,
  canShowPopupOn,
  nextQuestionIndex,
  parseLastIndex,
  parsePopupSession,
  popupDelay,
  recordPopupClosed,
  recordPopupShown,
  wrapIndex,
} from '../lib/promoPopup'

describe('popup questions', () => {
  it('has 12 questions, each in English and Bangla', () => {
    expect(POPUP_QUESTION_KEYS).toHaveLength(12)
    const missing = POPUP_QUESTION_KEYS.flatMap((key) =>
      (['en', 'bn'] as const).filter((l) => !lookupTranslation(l, key)).map((l) => `${l}:${key}`),
    )
    expect(missing).toEqual([])
    expect(lookupTranslation('en', 'popup.q1')).toBe('Need a Divorce?')
  })

  it('starts on the question after the last one shown, wrapping around', () => {
    expect(nextQuestionIndex(null, 12)).toBe(0)
    expect(nextQuestionIndex(0, 12)).toBe(1)
    expect(nextQuestionIndex(11, 12)).toBe(0)
    expect(nextQuestionIndex(4, 12)).not.toBe(4)
  })

  it('wraps slider steps both ways', () => {
    expect(wrapIndex(12, 12)).toBe(0)
    expect(wrapIndex(-1, 12)).toBe(11)
    expect(wrapIndex(5, 12)).toBe(5)
  })

  it('ignores a bad stored index', () => {
    expect(parseLastIndex(null, 12)).toBeNull()
    expect(parseLastIndex('', 12)).toBeNull()
    expect(parseLastIndex('abc', 12)).toBeNull()
    expect(parseLastIndex('12', 12)).toBeNull()
    expect(parseLastIndex('-1', 12)).toBeNull()
    expect(parseLastIndex('1.5', 12)).toBeNull()
    expect(parseLastIndex('7', 12)).toBe(7)
  })
})

describe('popup schedule', () => {
  const now = 1_000_000

  it('first shows a few seconds after landing', () => {
    expect(popupDelay(parsePopupSession(null), now)).toBe(POPUP_FIRST_DELAY_MS)
  })

  it('waits the re-show time after it is closed, then at least the first delay', () => {
    const shown = recordPopupShown(parsePopupSession(null), now)
    const closed = recordPopupClosed(shown, now + 10_000)
    expect(closed.shows).toBe(1)
    expect(popupDelay(closed, now + 10_000)).toBe(POPUP_RESHOW_AFTER_MS)
    expect(popupDelay(closed, now + 10_000 + POPUP_RESHOW_AFTER_MS + 60_000)).toBe(POPUP_FIRST_DELAY_MS)
  })

  it('does not come straight back after a reload while open', () => {
    const shown = recordPopupShown(parsePopupSession(null), now)
    expect(popupDelay(shown, now + 1_000)).toBe(POPUP_RESHOW_AFTER_MS - 1_000)
  })

  it('stops after the per-session cap', () => {
    let state = parsePopupSession(null)
    for (let i = 0; i < POPUP_MAX_SHOWS_PER_SESSION; i++) {
      expect(popupDelay(state, now)).not.toBeNull()
      state = recordPopupClosed(recordPopupShown(state, now), now)
    }
    expect(popupDelay(state, now + 24 * 60 * 60_000)).toBeNull()
  })

  it('treats malformed session data as a fresh session', () => {
    expect(parsePopupSession('not json')).toEqual({ shows: 0, nextAt: 0 })
    expect(parsePopupSession('null')).toEqual({ shows: 0, nextAt: 0 })
    expect(parsePopupSession('{"shows":"x","nextAt":-5}')).toEqual({ shows: 0, nextAt: 0 })
    expect(parsePopupSession('{"shows":2,"nextAt":123}')).toEqual({ shows: 2, nextAt: 123 })
  })
})

describe('popup routes', () => {
  it.each(['/', '/about', '/bn', '/bn/about', '/lawyers', '/lawyers/abc', '/blogs/some-post', '/practice-areas', '/track-case', '/gallery'])(
    'shows on public page %s',
    (path) => expect(canShowPopupOn(path)).toBe(true),
  )

  it.each([
    '/dashboard',
    '/dashboard/admin/content',
    '/profile',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/system-design',
    '/appointment',
    '/appointment/',
    '/contact',
    '/bn/contact',
  ])('never interrupts %s', (path) => expect(canShowPopupOn(path)).toBe(false))

  it('does not confuse lookalike paths', () => {
    expect(canShowPopupOn('/contacts-and-more')).toBe(true)
    expect(canShowPopupOn('/login?redirect=/')).toBe(false)
  })
})
