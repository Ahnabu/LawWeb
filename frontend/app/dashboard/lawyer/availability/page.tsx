"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DaySchedule,
  LawyerAvailability,
  getMyAvailability,
  updateMyAvailability,
} from "../../../../lib/dashboard";

const DAY_LABELS: Record<keyof LawyerAvailability["schedule"], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const buildDefaultSchedule = (): LawyerAvailability["schedule"] => ({
  monday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
  thursday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
  friday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
  saturday: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
  sunday: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
});

export default function LawyerAvailabilityPage() {
  const [availability, setAvailability] = useState<LawyerAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const data = await getMyAvailability();
        setAvailability(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  const schedule = useMemo(() => {
    if (availability?.schedule) {
      return availability.schedule;
    }
    return buildDefaultSchedule();
  }, [availability]);

  const handleScheduleChange = (
    day: keyof LawyerAvailability["schedule"],
    nextValue: Partial<DaySchedule>,
  ) => {
    setAvailability((current) => ({
      ...(current ?? {
        lawyerId: "",
        isAcceptingNewClients: true,
        schedule: schedule,
      }),
      schedule: {
        ...schedule,
        [day]: {
          ...schedule[day],
          ...nextValue,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!availability) {
      return;
    }

    setIsSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const updated = await updateMyAvailability({
        schedule: availability.schedule,
        isAcceptingNewClients: availability.isAcceptingNewClients,
      });
      setAvailability(updated);
      setSuccess("Availability updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update availability");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-40 animate-pulse rounded bg-surface-container" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`availability-skeleton-${index}`}
              className="h-16 animate-pulse rounded-lg border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Availability
        </h2>
        <p className="text-sm text-on-surface-variant">
          Update your consultation schedule and booking preferences.
        </p>
      </header>

      <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-on-surface">Accepting new clients</p>
            <p className="text-xs text-on-surface-variant">
              Toggle visibility on the public booking form.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={availability?.isAcceptingNewClients ?? true}
              onChange={(event) =>
                setAvailability((current) => ({
                  ...(current ?? {
                    lawyerId: "",
                    isAcceptingNewClients: true,
                    schedule: schedule,
                  }),
                  isAcceptingNewClients: event.target.checked,
                }))
              }
            />
            Open for bookings
          </label>
        </div>
      </section>

      <section className="space-y-4">
        {Object.entries(schedule).map(([day, values]) => {
          const key = day as keyof LawyerAvailability["schedule"];
          return (
            <div
              key={day}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {DAY_LABELS[key]}
                </p>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={values.isAvailable}
                    onChange={(event) =>
                      handleScheduleChange(key, { isAvailable: event.target.checked })
                    }
                  />
                  Available
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-on-surface-variant">
                  Start
                  <input
                    type="time"
                    className="ml-2 rounded-lg border border-outline bg-surface px-2 py-1 text-sm"
                    value={values.startTime}
                    onChange={(event) =>
                      handleScheduleChange(key, { startTime: event.target.value })
                    }
                    disabled={!values.isAvailable}
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  End
                  <input
                    type="time"
                    className="ml-2 rounded-lg border border-outline bg-surface px-2 py-1 text-sm"
                    value={values.endTime}
                    onChange={(event) =>
                      handleScheduleChange(key, { endTime: event.target.value })
                    }
                    disabled={!values.isAvailable}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </section>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
