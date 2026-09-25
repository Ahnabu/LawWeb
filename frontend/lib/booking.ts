// Shared pieces of the consultation booking flow used by the public
// /appointment page (AppointmentBookingForm).

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "./api";

export interface BookableLawyer {
  _id: string;
  name: string;
  barId?: string;
  specialization?: string;
}

export interface DaySchedule {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export interface LawyerAvailability {
  isAcceptingNewClients: boolean;
  schedule: Record<string, DaySchedule>;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: "booked" | "past";
}

export const CONSULTATION_TYPES = [
  { value: "initial-consultation", label: "Initial Consultation" },
  { value: "follow-up", label: "Follow-up Session" },
  { value: "document-review", label: "Document Review" },
  { value: "case-discussion", label: "Case Discussion" },
];

export const MEETING_MODES = [
  { value: "in-person", label: "In-Person" },
  { value: "phone", label: "Phone Call" },
  { value: "video", label: "Video Call" },
];

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 500;

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEK_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Slots are in the firm's local time, so "today" must be computed there too,
// not from the browser clock or UTC.
const BUSINESS_TIMEZONE = "Asia/Dhaka";
export const businessToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(new Date());

const utcDateOf = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Day of week for a "YYYY-MM-DD" string, independent of the browser timezone
export const dayNameOf = (dateStr: string) => DAY_NAMES[utcDateOf(dateStr).getUTCDay()];

// e.g. "Monday, 5 October 2026"
export const formatDateLabel = (dateStr: string) =>
  utcDateOf(dateStr).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// e.g. "Mon 09:00–17:00, Tue 09:00–17:00"
export const formatAvailableDays = (availability: LawyerAvailability) =>
  WEEK_ORDER
    .filter((d) => availability.schedule[d]?.isAvailable)
    .map((d) => `${d.charAt(0).toUpperCase() + d.slice(1, 3)} ${availability.schedule[d].startTime}–${availability.schedule[d].endTime}`)
    .join(", ");

// Loads a lawyer's weekly availability and, once a date is picked, the server's
// slot list for that date (which knows which slots are booked or already started).
export function useLawyerSchedule(lawyerId: string, date: string) {
  const [availability, setAvailability] = useState<LawyerAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  // Slots are tagged with the lawyer/date they were loaded for, so a stale list
  // is never shown for a newly picked date.
  const [slots, setSlots] = useState<{ key: string; list: TimeSlot[] }>({ key: "", list: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const reloadSlots = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    setAvailability(null);
    setAvailabilityLoading(Boolean(lawyerId));
    if (!lawyerId) return;
    // Ignore responses for a lawyer the user has already switched away from
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/availability`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAvailability(d.data || null); })
      .catch(() => { if (!cancelled) setAvailability(null); })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [lawyerId]);

  const isDateDisabled = useCallback((dateStr: string): boolean => {
    if (!availability || !dateStr) return false;
    return !availability.schedule[dayNameOf(dateStr)]?.isAvailable;
  }, [availability]);

  const key = `${lawyerId}|${date}`;
  const dayOff = isDateDisabled(date);

  useEffect(() => {
    // Availability not known yet: nothing to show, but don't claim "no slots" either
    if (!lawyerId || !date || !availability) {
      setSlots({ key: "", list: [] });
      setSlotsLoading(false);
      return;
    }
    if (dayOff) {
      setSlots({ key, list: [] });
      setSlotsLoading(false);
      return;
    }
    const controller = new AbortController();
    setSlotsLoading(true);
    fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/slots?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load time slots");
        setSlots({ key, list: data.data?.slots ?? [] });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSlots({ key, list: [] });
        toast.error(err instanceof Error ? err.message : "Unable to load time slots");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });
    return () => controller.abort();
  }, [key, lawyerId, date, availability, dayOff, reloadToken]);

  const current = slots.key === key;
  return {
    availability,
    availabilityLoading,
    isDateDisabled,
    dayOff,
    timeSlots: current ? slots.list : [],
    // True once the slot list for the current lawyer/date has finished loading
    slotsReady: current && !slotsLoading,
    slotsLoading,
    reloadSlots,
  };
}
