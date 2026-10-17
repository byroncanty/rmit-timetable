import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { AgendaView, type AgendaDay } from './components/AgendaView';
import { EventDrawer } from './components/EventDrawer';
import { Filters, type UnitInfo } from './components/Filters';
import { ChevronLeft, ChevronRight, Download, Moon, Printer, Sun } from './components/icons';
import { Key } from './components/Key';
import { NextClass } from './components/NextClass';
import { WeekGrid, type DayColumn } from './components/WeekGrid';
import { useLocalState, useMediaQuery, useNow, useTheme } from './hooks';
import { loadFeed, type FeedResult } from './lib/feed';
import { parseIcs } from './lib/ical';
import { checkRoomChanges } from './lib/nextClass';
import { addDaysKey, addWeeksKey, dateKey, fmtKey, isoWeekday, minutesOfDay, mondayOf } from './lib/time';
import type { GridItem, TimetableEvent } from './lib/types';
import { DEFAULT_UNIT_NAMES, KEY_NAMES, buildHueMap, hueOf } from './lib/units';
import { WEEKDAYS, eventsInWeek, gridRange, inTerm, initialWeek, isBreakWeek, isTeachingDay, teachingWeek, termInfo, toGridItem, typicalWeek, weekLabel } from './lib/weeks';

type View = 'week' | 'typical' | 'agenda';
type FeedState = { status: 'loading'; previous?: FeedResult } | { status: 'ready'; feed: FeedResult } | { status: 'error'; message: string };

const VIEWS: { id: View; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'typical', label: 'Typical week' },
  { id: 'agenda', label: 'Agenda' },
];
// Re-check the feed for room changes this often, and when the tab comes back after a while.
const RECHECK_MS = 10 * 60_000;
const STALE_ON_FOCUS_MS = 5 * 60_000;
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export default function App() {
  const [names, setNames] = useLocalState<Record<string, string>>('timetable:names', {});
  const [hiddenUnits, setHiddenUnits] = useLocalState<string[]>('timetable:hiddenUnits', []);
  const [hiddenActivities, setHiddenActivities] = useLocalState<string[]>('timetable:hiddenActivities', []);
  const [view, setView] = useLocalState<View>('timetable:view', 'week');
  const [state, setState] = useState<FeedState>({ status: 'loading' });
  const [reloadTick, setReloadTick] = useState(0);
  const [weekKey, setWeekKey] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const [selected, setSelected] = useState<{ event: TimetableEvent; typical: boolean } | null>(null);
  const [exporting, setExporting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const { dark, toggle: toggleTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const now = useNow(30_000);

  // Load on start, on "Try again", and on the timers below.
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ status: 'loading', previous: s.status === 'ready' ? s.feed : s.status === 'loading' ? s.previous : undefined }));
    loadFeed()
      .then((feed) => !cancelled && setState({ status: 'ready', feed }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const lastCheck = useRef(0);
  useEffect(() => {
    const recheck = () => setReloadTick((t) => t + 1);
    const id = setInterval(recheck, RECHECK_MS);
    const onVisible = () => document.visibilityState === 'visible' && Date.now() - lastCheck.current > STALE_ON_FOCUS_MS && recheck();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const feed = state.status === 'ready' ? state.feed : state.status === 'loading' ? state.previous : undefined;
  const friendlyNames = useMemo(() => ({ ...DEFAULT_UNIT_NAMES, ...names }), [names]);

  const parsed = useMemo(() => {
    if (!feed) return { events: [] as TimetableEvent[], error: null as string | null };
    try {
      return { events: parseIcs(feed.text, friendlyNames), error: null };
    } catch (err) {
      return { events: [], error: `Couldn't read the calendar: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, [feed, friendlyNames]);
  const events = parsed.events;

  // Compare each fresh copy of the feed with the rooms seen before.
  const [roomChanges, setRoomChanges] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!feed || !events.length) return;
    if (!feed.stale) lastCheck.current = feed.fetchedAt.getTime();
    setRoomChanges(checkRoomChanges(events));
  }, [feed, events]);

  const units: UnitInfo[] = useMemo(() => {
    const map = new Map<string, UnitInfo>();
    for (const e of events) if (!map.has(e.unitCode)) map.set(e.unitCode, { code: e.unitCode, shortName: e.unitShortName, defaultName: DEFAULT_UNIT_NAMES[e.unitCode] ?? e.unitShortName });
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [events]);
  const activities = useMemo(() => [...new Set(events.map((e) => e.activity))].sort(), [events]);
  const hueMap = useMemo(() => buildHueMap(units.map((u) => u.code)), [units]);
  const hueFor = useCallback((code: string) => hueOf(hueMap, code), [hueMap]);

  const visible = useMemo(
    () => events.filter((e) => !hiddenUnits.includes(e.unitCode) && !hiddenActivities.includes(e.activity)),
    [events, hiddenUnits, hiddenActivities],
  );
  const term = useMemo(() => termInfo(events), [events]);
  const range = useMemo(() => gridRange(events), [events]);
  const todayKey = dateKey(now);
  // Classes run Monday–Thursday, so from Friday the "current" week is the coming one.
  const thisWeek = isTeachingDay(isoWeekday(now)) ? mondayOf(todayKey) : addWeeksKey(mondayOf(todayKey), 1);

  // Pick the starting week once events arrive.
  useEffect(() => {
    if (weekKey == null && events.length) setWeekKey(initialWeek(term, thisWeek));
  }, [events.length, term, thisWeek, weekKey]);

  const week = weekKey ?? thisWeek;
  const weekEvents = useMemo(() => eventsInWeek(visible, week).filter((e) => isTeachingDay(e.weekday)), [visible, week]);
  const typical = useMemo(() => typicalWeek(visible, term?.breakWeeks).filter((t) => isTeachingDay(t.weekday)), [visible, term]);
  const gridItems: GridItem[] = view === 'typical' ? typical : weekEvents.map(toGridItem);

  const moveWeek = useCallback((delta: number) => {
    setDir(delta < 0 ? -1 : 1);
    setWeekKey((w) => addWeeksKey(w ?? thisWeek, delta));
  }, [thisWeek]);
  const goToday = useCallback(() => {
    setDir(week > thisWeek ? -1 : 1);
    setWeekKey(thisWeek);
  }, [week, thisWeek]);

  // ← / → change week, T jumps to this week.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || view === 'typical') return;
      if (e.key === 'ArrowLeft') moveWeek(-1);
      else if (e.key === 'ArrowRight') moveWeek(1);
      else if (e.key.toLowerCase() === 't') goToday();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveWeek, goToday, selected, view]);

  const typicalView = view === 'typical';
  const columns: DayColumn[] = WEEKDAYS.map((wd) => {
    const key = addDaysKey(week, wd - 1);
    return {
      weekday: wd,
      label: typicalView ? fmtKey(key, 'EEEE') : fmtKey(key, 'EEE'),
      sub: typicalView ? undefined : fmtKey(key, 'd MMM'),
      isToday: !typicalView && key === todayKey,
    };
  });
  const agendaDays: AgendaDay[] = WEEKDAYS.map((wd) => {
    const key = addDaysKey(week, wd - 1);
    return {
      weekday: wd,
      label: fmtKey(key, 'EEEE'),
      short: fmtKey(key, 'EEE'),
      sub: typicalView ? undefined : fmtKey(key, 'd MMM'),
      isToday: !typicalView && key === todayKey,
      items: gridItems.filter((i) => i.weekday === wd),
    };
  });
  const todayWeekday = columns.find((c) => c.isToday)?.weekday ?? null;

  const animKey = typicalView ? 'typical' : week;

  const exportPng = async () => {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const url = await toPng(gridRef.current, { pixelRatio: 2, backgroundColor: dark ? '#18181b' : '#ffffff' });
      const a = document.createElement('a');
      a.href = url;
      a.download = typicalView ? 'timetable-typical-week.png' : `timetable-${week}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const resetPrefs = () => {
    setNames({});
    setHiddenUnits([]);
    setHiddenActivities([]);
  };

  const breakWeek = !!term && !typicalView && isBreakWeek(week, term);
  const weekNo = term && !typicalView ? (!inTerm(week, term) ? 'Outside term' : breakWeek ? 'Break week' : `Week ${teachingWeek(week, term)}`) : null;
  const showGrid = !isMobile && view !== 'agenda';
  const error = state.status === 'error' ? state.message : parsed.error;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-10 sm:px-6 lg:px-8">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-9" />
          <div>
            <h1 className="text-lg leading-tight font-semibold tracking-tight">Weekly Timetable</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">RMIT myTimetable · Monday to Thursday</p>
          </div>
        </div>
        <div className="no-print flex items-center gap-2">
          <button type="button" className="btn-icon" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? <Sun width={16} height={16} /> : <Moon width={16} height={16} />}
          </button>
        </div>
      </header>

      {error && !events.length ? (
        <div className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40">
          <p className="font-medium text-rose-800 dark:text-rose-200">Couldn't load your timetable</p>
          <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <div className="mt-4 flex justify-center">
            <button type="button" className="btn-primary" onClick={() => setReloadTick((t) => t + 1)}>
              Try again
            </button>
          </div>
        </div>
      ) : !events.length ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading timetable">
          <div className="h-[220px] animate-pulse rounded-3xl bg-zinc-200/70 dark:bg-zinc-800/60" />
          <div className="h-[560px] animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/60" />
        </div>
      ) : (
        <>
          <div className="no-print mt-5">
            <NextClass
              events={events}
              roomChanges={roomChanges}
              checkedAt={feed?.generatedAt ?? feed?.fetchedAt}
              offline={!!feed?.stale}
              hueFor={hueFor}
              onSelect={(e) => setSelected({ event: e, typical: false })}
            />
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {typicalView ? (
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Typical week</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">The whole term collapsed into one repeating week</p>
                </div>
              ) : (
                <>
                  <div className="no-print flex items-center">
                    <button type="button" className="btn-icon rounded-r-none" onClick={() => moveWeek(-1)} aria-label="Previous week" title="Previous week (←)">
                      <ChevronLeft width={16} height={16} />
                    </button>
                    <button type="button" className="btn-icon -ml-px rounded-l-none" onClick={() => moveWeek(1)} aria-label="Next week" title="Next week (→)">
                      <ChevronRight width={16} height={16} />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold tracking-tight" aria-live="polite">
                      {weekLabel(week)}
                    </h2>
                    {weekNo && <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{weekNo}</p>}
                  </div>
                  {week !== thisWeek && (
                    <button type="button" className="btn no-print ml-1" onClick={goToday} title="This week (T)">
                      This week
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="no-print flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="View" className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    role="tab"
                    aria-selected={view === v.id}
                    onClick={() => {
                      setView(v.id);
                      setDir(1);
                    }}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition ${view === v.id ? 'bg-white shadow-sm dark:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <Filters
                units={units}
                activities={activities}
                hiddenUnits={hiddenUnits}
                hiddenActivities={hiddenActivities}
                names={names}
                hueFor={hueFor}
                onToggleUnit={(c) => setHiddenUnits((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]))}
                onToggleActivity={(a) => setHiddenActivities((h) => (h.includes(a) ? h.filter((x) => x !== a) : [...h, a]))}
                onRename={(c, n) => setNames((m) => ({ ...m, [c]: n }))}
                onReset={resetPrefs}
              />
              {showGrid && (
                <>
                  <button type="button" className="btn-icon" onClick={() => window.print()} aria-label="Print" title="Print (A4 landscape)">
                    <Printer width={16} height={16} />
                  </button>
                  <button type="button" className="btn-icon" onClick={exportPng} disabled={exporting} aria-label="Download as PNG" title="Download as PNG">
                    <Download width={16} height={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Key
              activities={activities}
              units={units.map((u) => ({ code: u.code, name: KEY_NAMES[u.code] ?? (friendlyNames[u.code] || u.shortName), title: `${u.code} · ${friendlyNames[u.code] || u.shortName}` }))}
              hueFor={hueFor}
            />
          </div>

          {breakWeek && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <span className="font-semibold">Break week</span> · no classes {weekLabel(week)}. Teaching weeks pick up again next week.
            </div>
          )}

          <main className="mt-4">
            {showGrid ? (
              <WeekGrid
                ref={gridRef}
                items={gridItems}
                days={columns}
                range={range}
                nowMin={todayWeekday ? minutesOfDay(now) : null}
                hueFor={hueFor}
                onSelect={(i) => setSelected({ event: i.event, typical: typicalView })}
                animKey={animKey}
                dir={dir}
              />
            ) : (
              <AgendaView
                days={agendaDays}
                single={isMobile}
                hueFor={hueFor}
                onSelect={(i) => setSelected({ event: i.event, typical: typicalView })}
                onEdge={typicalView ? undefined : moveWeek}
                animKey={animKey}
              />
            )}
            {!typicalView && !breakWeek && gridItems.length === 0 && showGrid && (
              <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">No classes this week{hiddenUnits.length + hiddenActivities.length ? ' (some classes are hidden)' : ''}.</p>
            )}
          </main>

          <footer className="no-print mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> change week · <kbd className="font-sans">T</kbd> this week
          </footer>
        </>
      )}

      {selected && (
        <EventDrawer
          event={selected.event}
          allEvents={events}
          term={term}
          hue={hueFor(selected.event.unitCode)}
          now={now}
          typical={selected.typical}
          onClose={() => setSelected(null)}
          onJump={(e) => {
            if (view === 'typical') setView('week');
            setDir(e.weekKey < week ? -1 : 1);
            setWeekKey(e.weekKey);
            setSelected({ event: e, typical: false });
          }}
        />
      )}

    </div>
  );
}
