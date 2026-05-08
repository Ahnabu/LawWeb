"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { API_BASE_URL } from "../../../../lib/api";

interface Lawyer {
  _id: string;
  name: string;
  barId?: string;
  specialization?: string;
  isVerified: boolean;
}

const CONSULTATION_TYPES = [
  { value: "initial-consultation", label: "Initial Consultation" },
  { value: "follow-up", label: "Follow-up Session" },
  { value: "document-review", label: "Document Review" },
  { value: "case-discussion", label: "Case Discussion" },
];

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "02:00 PM", "03:00 PM", "04:00 PM",
];

export default function BookConsultationPage() {
  const router = useRouter();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const [form, setForm] = useState({
    lawyerId: "",
    consultationType: "initial-consultation",
    date: "",
    time: "",
    subject: "",
    description: "",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/lawyers`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLawyers(d.lawyers || []))
      .catch(() => toast.error("Unable to load lawyers. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.lawyerId) errors.lawyerId = "Please select a lawyer";
    if (!form.date) {
      errors.date = "Please select a date";
    } else if (new Date(form.date) < new Date(new Date().toDateString())) {
      errors.date = "Please select a future date";
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
        body: JSON.stringify(form),
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

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
          Book a Consultation
        </p>
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Schedule Your Session
        </h3>
        <p className="text-sm text-on-surface-variant">
          Connect with our experienced lawyers for professional legal guidance.
        </p>
      </header>

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
                {...field("lawyerId")}
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
            </div>

            {/* Consultation type */}
            <div>
              <label htmlFor="consultation-type" className="mb-1 block text-sm font-medium text-on-surface-variant">
                Consultation Type <span className="text-error">*</span>
              </label>
              <select
                id="consultation-type"
                {...field("consultationType")}
                className="w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                {CONSULTATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
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
                  {...field("date")}
                  className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.date ? "border-error" : "border-outline"}`}
                />
                {fieldErrors.date && (
                  <p className="mt-1 text-xs text-error">{fieldErrors.date}</p>
                )}
              </div>
              <div>
                <label htmlFor="consult-time" className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Time <span className="text-error">*</span>
                </label>
                <select
                  id="consult-time"
                  {...field("time")}
                  className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.time ? "border-error" : "border-outline"}`}
                >
                  <option value="">Select a time slot...</option>
                  {TIME_SLOTS.map((t) => (
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
                {...field("subject")}
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
                {...field("description")}
                className={`w-full resize-none rounded-lg border bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${fieldErrors.description ? "border-error" : "border-outline"}`}
              />
              <p className="mt-1 text-xs text-on-surface-variant">{form.description.length}/500</p>
              {fieldErrors.description && (
                <p className="text-xs text-error">{fieldErrors.description}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
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
