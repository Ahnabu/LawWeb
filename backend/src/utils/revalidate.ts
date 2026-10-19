// Tells the Next.js frontend to drop its cached CMS content after a publish.
// Returns false when it is not configured (FRONTEND_REVALIDATE_URL and
// REVALIDATE_SECRET) or the call fails; the frontend's time-based
// revalidation still picks the change up in that case.
export const notifyContentPublished = async (pageKey: string): Promise<boolean> => {
  const url = process.env.FRONTEND_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    console.warn('Content revalidation skipped: FRONTEND_REVALIDATE_URL or REVALIDATE_SECRET is not set');
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: ['content', `content:${pageKey}`] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`Content revalidation failed (${res.status}) for page "${pageKey}"`);
    return res.ok;
  } catch (error) {
    console.error('Content revalidation error:', error);
    return false;
  }
};
