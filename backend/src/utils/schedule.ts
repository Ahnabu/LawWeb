// Shared scheduling rules for lawyer availability and consultation booking.
// Appointment dates are stored as UTC midnight of the calendar day; times are
// wall-clock times in the firm's timezone (BUSINESS_TIMEZONE, default Asia/Dhaka).

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const SLOT_MINUTES = 60;
export const ACTIVE_STATUSES = ['scheduled', 'rescheduled'] as const;

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Dhaka';

export interface DaySchedule {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export type WeekSchedule = Record<DayKey, DaySchedule>;

/** Parses "YYYY-MM-DD" (or an ISO string starting with it) into a UTC-midnight Date. */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayKeyOf(date: Date): DayKey {
  return DAY_KEYS[date.getUTCDay()];
}

/** Accepts "HH:mm" (24h) or "hh:mm AM/PM" and returns minutes since midnight. */
export function toMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(value.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
    if (meridiem === 'PM') hours += 12;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Canonical stored/display label, e.g. "02:00 PM". */
export function formatSlotLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Start minutes of every full slot that fits inside the day's working hours. */
export function generateSlots(day: DaySchedule | undefined): number[] {
  if (!day?.isAvailable) return [];
  const start = toMinutes(day.startTime);
  const end = toMinutes(day.endTime);
  if (start === null || end === null) return [];
  const slots: number[] = [];
  for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) slots.push(t);
  return slots;
}

/** Current calendar date and minute-of-day in the business timezone. */
export function businessNow(): { dateKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** True when the slot starting at `minutes` on `date` has already started. */
export function hasSlotStarted(date: Date, minutes: number): boolean {
  const now = businessNow();
  const key = toDateKey(date);
  if (key !== now.dateKey) return key < now.dateKey;
  return minutes <= now.minutes;
}

const DEFAULT_WORKDAY: DaySchedule = { isAvailable: true, startTime: '09:00', endTime: '17:00' };
const DEFAULT_WEEKEND: DaySchedule = { isAvailable: false, startTime: '09:00', endTime: '17:00' };

export function defaultSchedule(): WeekSchedule {
  return {
    monday: { ...DEFAULT_WORKDAY },
    tuesday: { ...DEFAULT_WORKDAY },
    wednesday: { ...DEFAULT_WORKDAY },
    thursday: { ...DEFAULT_WORKDAY },
    friday: { ...DEFAULT_WORKDAY },
    saturday: { ...DEFAULT_WEEKEND },
    sunday: { ...DEFAULT_WEEKEND },
  };
}

/**
 * Validates and normalizes a weekly schedule from a request body.
 * Returns the cleaned schedule (times as "HH:mm") or an error message.
 */
export function normalizeSchedule(input: unknown): { schedule?: WeekSchedule; error?: string } {
  if (!input || typeof input !== 'object') return { error: 'Schedule must be an object' };
  const raw = input as Record<string, any>;
  const schedule = defaultSchedule();

  for (const day of DAY_KEYS) {
    const entry = raw[day];
    if (!entry || typeof entry !== 'object') return { error: `Schedule for ${day} is missing` };

    const start = toMinutes(entry.startTime);
    const end = toMinutes(entry.endTime);
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    if (start === null || end === null) return { error: `${label}: start and end times must be valid (HH:mm)` };

    const isAvailable = Boolean(entry.isAvailable);
    if (isAvailable && end - start < SLOT_MINUTES) {
      return { error: `${label}: end time must be at least ${SLOT_MINUTES} minutes after start time` };
    }

    const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    schedule[day] = { isAvailable, startTime: hhmm(start), endTime: hhmm(end) };
  }

  return { schedule };
}
