import type { Room } from './types';

export type DeliveryMode = 'in-person' | 'online';

/** Classes with a room are on campus; classes without one ("-" in the feed) run on Canvas. */
export const DELIVERY: Record<DeliveryMode, { label: string; place: string }> = {
  'in-person': { label: 'In person', place: 'Melbourne City campus' },
  online: { label: 'Online', place: 'Canvas' },
};

export const MODES: DeliveryMode[] = ['in-person', 'online'];

// RMIT campus codes found at the end of offering codes in the feed.
const CAMPUS_NAMES: Record<string, string> = { AUSCY: 'Melbourne City campus' };
export const campusName = (code?: string) => (code && CAMPUS_NAMES[code]) || DELIVERY['in-person'].place;

export const CANVAS_URL = 'https://rmit.instructure.com';

export const modeOf = (location: string | null): DeliveryMode => (location ? 'in-person' : 'online');

/** Short "where" for cards and lists: the room, or "Canvas". */
export function whereShort(mode: DeliveryMode, location: string | null, room?: Room): string {
  if (mode === 'online') return DELIVERY.online.place;
  return room?.label ?? location ?? DELIVERY['in-person'].place;
}

/** Map search for an RMIT building: Apple Maps on iPhone/iPad, Google Maps elsewhere. */
export function directionsUrl(building: string): string {
  const query = encodeURIComponent(`RMIT University Building ${building}, Melbourne VIC`);
  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  return apple ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`;
}
