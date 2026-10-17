import { track } from "@vercel/analytics/server";

/**
 * Track custom backend events in Vercel Analytics.
 * Gracefully handles errors in local environments or non-Vercel deployments.
 */
export async function trackBackendEvent(
  eventName: string,
  data?: Record<string, string | number | boolean | null>
): Promise<void> {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    try {
      await track(eventName, data);
    } catch (err) {
      // Avoid failing request if analytics ingestion fails
      console.warn(`[Vercel Analytics] Failed to track ${eventName}:`, err);
    }
  }
}
