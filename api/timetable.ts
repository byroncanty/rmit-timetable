// Vercel serverless function: GET /api/timetable returns the feed at ICAL_URL.
import { proxyIcal } from '../server/fetchIcal.js';

export async function GET(): Promise<Response> {
  const r = await proxyIcal(process.env.ICAL_URL);
  return new Response(r.body, { status: r.status, headers: r.headers });
}
