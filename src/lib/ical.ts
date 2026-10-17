import ICAL from 'ical.js';
import { modeOf } from './delivery';
import { parseDescription, parseSummary } from './parseSummary';
import { normaliseLocation, parseRoom } from './rooms';
import { dateKey, isoWeekday, minutesOfDay, mondayOf } from './time';
import type { TimetableEvent } from './types';

/** Feed times are Melbourne wall-clock times, so read them as local time. */
const toDate = (t: ICAL.Time) =>
  t.zone?.tzid === 'UTC' ? t.toJSDate() : new Date(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);

export function parseIcs(text: string, friendlyNames: Record<string, string> = {}): TimetableEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  const events: TimetableEvent[] = [];

  root.getAllSubcomponents('vevent').forEach((vevent, i) => {
    const ev = new ICAL.Event(vevent);
    if (!ev.startDate || ev.startDate.isDate) return; // skip all-day entries

    const start = toDate(ev.startDate);
    const end = ev.endDate ? toDate(ev.endDate) : new Date(start.getTime() + 3600_000);
    const summary = ev.summary ?? '';
    const description = ev.description ?? '';
    const s = parseSummary(summary);
    const d = parseDescription(description);
    const location = normaliseLocation(ev.location);
    const dk = dateKey(start);
    const startMin = minutesOfDay(start);
    // Clamp classes that run past midnight to the end of the day.
    const endMin = dateKey(end) === dk ? minutesOfDay(end) : 24 * 60;

    events.push({
      uid: ev.uid || `event-${i}`,
      start,
      end,
      ...s,
      unitName: friendlyNames[s.unitCode] || s.unitShortName || s.unitCode,
      location,
      mode: modeOf(location),
      room: parseRoom(location),
      staff: d.staff,
      courseCode: d.courseCode,
      campusCode: d.campusCode,
      raw: { summary, description },
      classKey: `${s.unitCode}|${s.activity}|${s.group}`,
      dateKey: dk,
      weekKey: mondayOf(dk),
      weekday: isoWeekday(start),
      startMin,
      endMin: Math.max(endMin, startMin + 15),
    });
  });

  return events.sort((a, b) => a.start.getTime() - b.start.getTime() || a.unitCode.localeCompare(b.unitCode));
}
