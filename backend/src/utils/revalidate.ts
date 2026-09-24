// Tells the Next.js frontend to drop its cached CMS content after a publish.
// No-op until FRONTEND_REVALIDATE_URL and REVALIDATE_SECRET are configured;
// the frontend's time-based revalidation still picks changes up in that case.
export const notifyContentPublished = async (pageKey: string): Promise<void> => {
  const url = process.env.FRONTEND_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: ['content', `content:${pageKey}`] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`Content revalidation failed (${res.status}) for page "${pageKey}"`);
  } catch (error) {
    console.error('Content revalidation error:', error);
  }
};
