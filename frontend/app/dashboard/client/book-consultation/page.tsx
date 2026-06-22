"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { API_BASE_URL } from "../../../../lib/api";

interface Lawyer {
  _id: string;
  name: string;
  barId?: string;
  specialization?: string;
  isVerified: boolean;
}

interface DaySchedule {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface LawyerAvailability {
  isAcceptingNewClients: boolean;
  schedule: Record<string, DaySchedule>;
}

const CONSULTATION_TYPES = [
  { value: "initial-consultation", label: "Initial Consultation" },
  { value: "follow-up", label: "Follow-up Session" },
  { value: "document-review", label: "Document Review" },
  { value: "case-discussion", label: "Case Discussion" },
];

const MEETING_MODES = [
  { value: "in-person", label: "In-Person" },
  { value: "phone", label: "Phone Call" },
  { value: "video", label: "Video Call" },
];

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;
  while (current + 60 <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const ampm = h < 12 ? "AM" : "PM";
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`);
    current += 60;
  }
  return slots;
}

export default function BookConsultationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLawyerId = searchParams.get("lawyerId") ?? "";
  const preselectedLawyerName = searchParams.get("lawyerName") ?? "";

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [availability, setAvailability] = useState<LawyerAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const [form, setForm] = useState({
    lawyerId: preselectedLawyerId,
    consultationType: "initial-consultation",
    meetingMode: "in-person",
    date: "",
    time: "",
    subject: "",
    description: "",
    clientPhone: "",
    whatsappDocSharing: false,
    whatsappDocNote: "",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/lawyers`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLawyers(d.lawyers || []))
      .catch(() => toast.error("Unable to load lawyers. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const fetchAvailability = useCallback(async (lawyerId: string) => {
    if (!lawyerId) { setAvailability(null); setTimeSlots([]); return; }
    setAvailabilityLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/availability`);
      const data = await res.json();
      setAvailability(data.data || null);
    } catch {
      setAvailability(null);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preselectedLawyerId) fetchAvailability(preselectedLawyerId);
  }, [preselectedLawyerId, fetchAvailability]);

  // Recalculate time slots when date + availability changes
  useEffect(() => {
    if (!form.date || !availability) { setTimeSlots([]); return; }
    const dayIndex = new Date(form.date + "T00:00:00").getDay();
    const dayName = DAY_NAMES[dayIndex];
    const daySchedule = availability.schedule[dayName];
    if (!daySchedule || !daySchedule.isAvailable) { setTimeSlots([]); return; }
    setTimeSlots(generateTimeSlots(daySchedule.startTime, daySchedule.endTime));
    setForm((f) => ({ ...f, time: "" }));
  }, [form.date, availability]);

  const isDateDisabled = (dateStr: string): boolean => {
    if (!availability || !dateStr) return false;
    const dayIndex = new Date(dateStr + "T00:00:00").getDay();
    const dayName = DAY_NAMES[dayIndex];
    const daySchedule = availability.schedule[dayName];
    return !daySchedule?.isAvailable;
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.lawyerId) errors.lawyerId = "Please select a lawyer";
    if (!form.date) {
      errors.date = "Please select a date";
    } else if (new Date(form.date) < new Date(new Date().toDateString())) {
      errors.date = "Please select a future date";
    } else if (isDateDisabled(form.date)) {
      errors.date = "The lawyer is not available on this day";
    }
    if (!form.time) errors.time = "Please select a time slot";
    if (!form.subject.trim()) errors.subject = "Please enter a subject";
    if (form.description.trim().length < 10)
      errors.description = "Description must be at least 10 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    if (!validate()) return;

    setSubmitting(true);
    const toastId = toast.loading("Booking consultation...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/consultations/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          clientPhone: form.clientPhone || undefined,
          whatsappDocNote: form.whatsappDocSharing ? form.whatsappDocNote : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to book consultation");
      toast.success("Consultation booked successfully!", { id: toastId });
      router.push("/dashboard/client/appointments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to book consultation", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            Book a Consultation
          </p>
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            Schedule Your Session
          </h3>
          <p className="text-sm text-on-surface-variant">
            Connect with our experienced lawyers for professional legal guidance.
          </p>
        </div>
        <Link
          href="/dashboard/client"
          className="inline-flex items-center justify-center rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary"
        >
          Back to Dashboard
        </Link>
      </header>

      {preselectedLawyerName && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-on-surface">
          Booking with <span className="font-semibold">{preselectedLawyerName}</span>
        </div>
      )}

      <div className="rounded-lg border border-outline-variant bg-surface-container p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-8 items-end gap-1">
                <div className="bar-wave h-8 w-1 rounded-full bg-primary" />
                <div className="bar-wave bar-wave-delay-1 h-8 w-1 rounded-full bg-primary" />
                <div className="bar-wave bar-wave-delay-2 h-8 w-1 rounded-full bg-primary" />
              </div>
              <p className="text-sm text-on-surface-variant">Loading available lawyers...</p>
            </div>
          </div>
        ) : lawyers.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-surface p-8 text-center">
            <p className="text-sm text-on-surface-variant">
              No lawyers available at the moment. Please try again later.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Lawyer */}
            <div>
              <label htmlFor="lawyer-select" className="mb-1 block text-sm font-medium text-on-surface-variant">
                Select a Lawyer <span className="text-error">*</span>
              </label>
              <select
                id="lawyer-select"
                value={form.lawyerId}
                onChange={(e) => {
                  setField("lawyerId", e.target.value);
                  setField("date", "");
                  setField("time", "");
                  fetchAvailability(e.target.value);
                }}
                className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.lawyerId ? "border-error" : "border-outline"}`}
              >
                <option value="">Choose a lawyer...</option>
                {lawyers.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}{l.barId ? ` (Bar ID: ${l.barId})` : ""}
                    {l.specialization ? ` — ${l.specialization}` : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.lawyerId && (
                <p className="mt-1 text-xs text-error">{fieldErrors.lawyerId}</p>
              )}
              {availabilityLoading && (
                <p className="mt-1 text-xs text-on-surface-variant">Loading availability...</p>
              )}
              {availability && !availability.isAcceptingNewClients && (
                <p className="mt-1 text-xs text-error">This lawyer is not currently accepting new clients.</p>
              )}
              {availability && availability.isAcceptingNewClients && (
                <p className="mt-1 text-xs text-success">Available days: {
                  Object.entries(availability.schedule)
                    .filter(([, s]) => s.isAvailable)
                    .map(([d]) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                    .join(", ")
                }</p>
              )}
            </div>

            {/* Consultation type + Meeting mode */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="consultation-type" className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Consultation Type <span className="text-error">*</span>
                </label>
                <select
                  id="consultation-type"
                  value={form.consultationType}
                  onChange={(e) => setField("consultationType", e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  {CONSULTATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="meeting-mode" className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Meeting Mode <span className="text-error">*</span>
                </label>
                <select
                  id="meeting-mode"
                  value={form.meetingMode}
                  onChange={(e) => setField("meetingMode", e.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  {MEETING_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date + Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="consult-date" className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Date <span className="text-error">*</span>
                </label>
                <input
                  id="consult-date"
                  type="date"
                  min={minDate}
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.date ? "border-error" : "border-outline"}`}
                />
                {fieldErrors.date && (
                  <p className="mt-1 text-xs text-error">{fieldErrors.date}</p>
                )}
                {form.date && isDateDisabled(form.date) && !fieldErrors.date && (
                  <p className="mt-1 text-xs text-error">Lawyer unavailable on this day.</p>
                )}
              </div>
              <div>
                <label htmlFor="consult-time" className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Time Slot <span className="text-error">*</span>
                </label>
                <select
                  id="consult-time"
                  value={form.time}
                  onChange={(e) => setField("time", e.target.value)}
                  disabled={timeSlots.length === 0}
                  className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none disabled:opacity-50 ${fieldErrors.time ? "border-error" : "border-outline"}`}
                >
                  <option value="">{timeSlots.length === 0 ? "Select a date first..." : "Select a time slot..."}</option>
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {fieldErrors.time && (
                  <p className="mt-1 text-xs text-error">{fieldErrors.time}</p>
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="consult-subject" className="mb-1 block text-sm font-medium text-on-surface-variant">
                Subject <span className="text-error">*</span>
              </label>
              <input
                id="consult-subject"
                type="text"
                placeholder="e.g. Property Dispute, Contract Review"
                value={form.subject}
                onChange={(e) => setField("subject", e.target.value)}
                className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.subject ? "border-error" : "border-outline"}`}
              />
              {fieldErrors.subject && (
                <p className="mt-1 text-xs text-error">{fieldErrors.subject}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="consult-desc" className="mb-1 block text-sm font-medium text-on-surface-variant">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                id="consult-desc"
                rows={5}
                placeholder="Describe your legal matter in detail..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className={`w-full resize-none rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.description ? "border-error" : "border-outline"}`}
              />
              <p className="mt-1 text-xs text-on-surface-variant">{form.description.length}/500</p>
              {fieldErrors.description && (
                <p className="text-xs text-error">{fieldErrors.description}</p>
              )}
            </div>

            {/* Contact phone */}
            <div>
              <label htmlFor="client-phone" className="mb-1 block text-sm font-medium text-on-surface-variant">
                Contact Phone
              </label>
              <input
                id="client-phone"
                type="tel"
                placeholder="+880 1XXXXXXXXX"
                value={form.clientPhone}
                onChange={(e) => setField("clientPhone", e.target.value)}
                className="w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            {/* WhatsApp doc sharing */}
            <div className="rounded-lg border border-outline-variant bg-surface p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.whatsappDocSharing}
                  onChange={(e) => setField("whatsappDocSharing", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-outline"
                />
                <span className="text-sm text-on-surface">
                  I plan to share case documents via WhatsApp with the lawyer
                </span>
              </label>
              {form.whatsappDocSharing && (
                <div>
                  <label htmlFor="whatsapp-note" className="mb-1 block text-xs font-medium text-on-surface-variant">
                    Document note (optional)
                  </label>
                  <input
                    id="whatsapp-note"
                    type="text"
                    placeholder="e.g. ID documents, property deed, contract"
                    value={form.whatsappDocNote}
                    onChange={(e) => setField("whatsappDocNote", e.target.value)}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || (availability !== null && !availability.isAcceptingNewClients)}
                className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Booking..." : "Book Consultation"}
              </button>
              <Link
                href="/dashboard/client"
                className="rounded-lg border border-outline px-6 py-2.5 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
