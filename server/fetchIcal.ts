// Shared proxy logic used by the Vite dev server and the Vercel function.
// The feed host sends no CORS headers, so the browser can't fetch it directly.

export interface ProxyResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

const MAX_BYTES = 2 * 1024 * 1024;

const result = (status: number, body: string, cache = 'no-store', type = 'text/plain; charset=utf-8'): ProxyResult => ({
  status,
  body,
  headers: { 'Content-Type': type, 'Cache-Control': cache },
});

/** Fetch the iCal feed at ICAL_URL server-side. */
export async function proxyIcal(feedUrl: string | undefined): Promise<ProxyResult> {
  if (!feedUrl) return result(500, 'ICAL_URL is not configured on the server.');
  try {
    const res = await fetch(feedUrl.replace(/^webcal:/i, 'https:'), {
      headers: { Accept: 'text/calendar, */*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return result(502, `Upstream feed returned HTTP ${res.status}.`);
    const text = await res.text();
    if (text.length > MAX_BYTES) return result(502, 'Upstream feed is too large.');
    if (!text.includes('BEGIN:VCALENDAR')) return result(502, 'Upstream response is not an iCal feed.');
    return result(200, text, 'public, s-maxage=900, stale-while-revalidate=3600', 'text/calendar; charset=utf-8');
  } catch (err) {
    return result(504, err instanceof Error && err.name === 'TimeoutError' ? 'Upstream feed timed out.' : 'Could not reach the upstream feed.');
  }
}
