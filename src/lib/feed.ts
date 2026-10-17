import { readJSON, writeJSON } from './storage';

export interface FeedResult {
  text: string;
  fetchedAt: Date;
  generatedAt?: Date; // when myTimetable produced this copy (DTSTAMP); on GitHub Pages it can be older than fetchedAt
  stale: boolean; // served from the local cache because the network failed
  error?: string;
}

interface Cached {
  text: string;
  fetchedAt: string;
}

const CACHE_KEY = 'timetable:feed';

// Next to the page: on GitHub Pages a scheduled Action publishes this file; in dev the Vite proxy serves it.
const FEED_URL = `${import.meta.env.BASE_URL}timetable.ics`;

async function fetchFeed(): Promise<string> {
  const res = await fetch(FEED_URL, { cache: 'no-store' });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('The response was not an iCal feed.');
  return text;
}

/** First DTSTAMP in the feed, e.g. "20261017T100823Z". */
export function feedGeneratedAt(text: string): Date | undefined {
  const m = text.match(/^DTSTAMP:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/m);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : undefined;
}

/** Fetch the feed, falling back to the last good copy when offline. */
export async function loadFeed(): Promise<FeedResult> {
  try {
    const text = await fetchFeed();
    writeJSON(CACHE_KEY, { text, fetchedAt: new Date().toISOString() } satisfies Cached);
    return { text, fetchedAt: new Date(), generatedAt: feedGeneratedAt(text), stale: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const c = readJSON<Cached | null>(CACHE_KEY, null);
    if (c && typeof c.text === 'string') return { text: c.text, fetchedAt: new Date(c.fetchedAt), generatedAt: feedGeneratedAt(c.text), stale: true, error: message };
    throw new Error(message);
  }
}
