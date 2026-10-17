import { addDaysKey, addWeeksKey, fmtKey, mondayOf, weeksBetween } from './time';
import type { GridItem, TimetableEvent } from './types';

/** Classes only run Monday to Thursday. */
export const WEEKDAYS = [1, 2, 3, 4];
export const LAST_WEEKDAY = WEEKDAYS[WEEKDAYS.length - 1];
export const isTeachingDay = (weekday: number) => weekday >= 1 && weekday <= LAST_WEEKDAY;

export interface TermInfo {
  firstWeek: string;
  lastWeek: string;
  weeksWithClasses: Set<string>;
  breakWeeks: Set<string>; // weeks inside the term with no classes at all, e.g. 2–5 Nov
}

/** Pass all events (not filtered ones), so a week only counts as a break when nothing is on. */
export function termInfo(events: TimetableEvent[]): TermInfo | null {
  if (!events.length) return null;
  const weeks = events.map((e) => e.weekKey).sort();
  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];
  const weeksWithClasses = new Set(weeks);
  const breakWeeks = new Set<string>();
  for (let w = firstWeek; w <= lastWeek; w = addWeeksKey(w, 1)) if (!weeksWithClasses.has(w)) breakWeeks.add(w);
  return { firstWeek, lastWeek, weeksWithClasses, breakWeeks };
}

export const isBreakWeek = (weekKey: string, term: TermInfo) => term.breakWeeks.has(weekKey);

/** Teaching week number, counted from the first class and skipping break weeks. */
export function teachingWeek(weekKey: string, term: TermInfo): number {
  let breaks = 0;
  for (const b of term.breakWeeks) if (b <= weekKey) breaks++;
  return weeksBetween(term.firstWeek, weekKey) + 1 - breaks;
}

export const inTerm = (weekKey: string, term: TermInfo) => weekKey >= term.firstWeek && weekKey <= term.lastWeek;

/** Current week when inside the term, otherwise the nearest week that has classes. */
export function initialWeek(term: TermInfo | null, todayKey: string): string {
  const thisWeek = mondayOf(todayKey);
  if (!term || inTerm(thisWeek, term)) return thisWeek;
  let best = term.firstWeek;
  let bestDist = Infinity;
  for (const w of term.weeksWithClasses) {
    const dist = Math.abs(weeksBetween(thisWeek, w));
    if (dist < bestDist) [best, bestDist] = [w, dist];
  }
  return best;
}

export const eventsInWeek = (events: TimetableEvent[], weekKey: string) => events.filter((e) => e.weekKey === weekKey);

export const toGridItem = (e: TimetableEvent): GridItem => ({ id: e.uid, event: e, weekday: e.weekday, startMin: e.startMin, endMin: e.endMin });

export interface TypicalClass extends GridItem {
  sessions: TimetableEvent[];
  missing: number;
}

/**
 * Collapse the term into one repeating week: one block per class + weekday + time slot.
 * Break weeks aren't counted as skipped sessions.
 */
export function typicalWeek(events: TimetableEvent[], breakWeeks: Set<string> = new Set()): TypicalClass[] {
  const groups = new Map<string, TimetableEvent[]>();
  for (const e of events) {
    const key = `${e.classKey}|${e.weekday}|${e.startMin}|${e.endMin}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  // The most common slot per class is "regular"; others are moved or one-off sessions.
  const maxPerClass = new Map<string, number>();
  for (const list of groups.values()) {
    const k = list[0].classKey;
    maxPerClass.set(k, Math.max(maxPerClass.get(k) ?? 0, list.length));
  }

  return [...groups.entries()].map(([key, sessions]) => {
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    const weeks = new Set(sessions.map((s) => s.weekKey)).size;
    let breaksInRange = 0;
    for (const b of breakWeeks) if (b > first.weekKey && b < last.weekKey) breaksInRange++;
    const missing = weeksBetween(first.weekKey, last.weekKey) + 1 - breaksInRange - weeks;
    const irregular = sessions.length < (maxPerClass.get(first.classKey) ?? 0) / 2;
    const range = sessions.length > 1 ? `${fmtKey(first.dateKey, 'd MMM')} – ${fmtKey(last.dateKey, 'd MMM')}` : fmtKey(first.dateKey, 'd MMM');
    return {
      id: key,
      event: first,
      weekday: first.weekday,
      startMin: first.startMin,
      endMin: first.endMin,
      sessions,
      missing,
      subtitle: `${sessions.length} session${sessions.length === 1 ? '' : 's'} · ${range}`,
      badge: irregular ? 'One-off / moved' : missing > 0 ? `${missing} wk skipped` : undefined,
    };
  });
}

/** Visible hours: fit the earliest and latest class, padded by 30 min. Falls back to 08:00–18:00. */
export function gridRange(events: TimetableEvent[]): { start: number; end: number } {
  const weekday = events.filter((e) => isTeachingDay(e.weekday));
  if (!weekday.length) return { start: 8 * 60, end: 18 * 60 };
  const min = Math.min(...weekday.map((e) => e.startMin));
  const max = Math.max(...weekday.map((e) => e.endMin));
  const start = Math.max(0, Math.floor((min - 30) / 60) * 60);
  const end = Math.min(24 * 60, Math.ceil((max + 30) / 60) * 60);
  return { start, end };
}

export function weekLabel(weekKey: string): string {
  const lastDay = addDaysKey(weekKey, LAST_WEEKDAY - 1);
  const sameMonth = fmtKey(weekKey, 'MMM') === fmtKey(lastDay, 'MMM');
  return `${fmtKey(weekKey, sameMonth ? 'd' : 'd MMM')} – ${fmtKey(lastDay, 'd MMM yyyy')}`;
}
