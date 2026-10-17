import type { CSSProperties, ReactNode } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useNow } from '../hooks';
import { CANVAS_URL, campusName, directionsUrl } from '../lib/delivery';
import { sessionKey, upNext } from '../lib/nextClass';
import { countdown, fmt, fmtTime, liveCountdown } from '../lib/time';
import type { TimetableEvent } from '../lib/types';
import { MODE_ICON_COLOR, ModeBadge, cardClass, pillClass } from './EventCard';
import { Laptop, MapPin, Refresh } from './icons';

interface Props {
  events: TimetableEvent[];
  roomChanges: Record<string, string | null>; // session key → previously seen room
  checkedAt?: Date;
  offline: boolean;
  checking: boolean;
  onCheck: () => void;
  hueFor: (code: string) => number;
  onSelect: (e: TimetableEvent) => void;
}

const Label = ({ children }: { children: ReactNode }) => <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{children}</div>;

function RoomChanged({ was }: { was: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
      Room changed{was ? ` · was ${was}` : ' · was online'}
    </span>
  );
}

/** The big "where do I need to be" panel: building for in-person classes, Canvas for online ones. */
function WherePanel({ event: e, was }: { event: TimetableEvent; was?: string | null }) {
  if (e.mode === 'online') {
    return (
      <div className={`${cardClass('online')} flex h-full flex-col rounded-2xl border-l-4 p-4`}>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <ModeBadge mode="online" size="md" /> <span className="opacity-80">Online class</span>
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">Canvas</div>
        <div className="text-sm opacity-80">No building, so join from anywhere</div>
        {was !== undefined && <div className="mt-2"><RoomChanged was={was} /></div>}
        <div className="mt-auto pt-3">
          <a href={CANVAS_URL} target="_blank" rel="noreferrer" className="btn-primary">
            <Laptop width={14} height={14} /> Open Canvas ↗
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className={`${cardClass('in-person')} flex h-full flex-col rounded-2xl border-l-4 p-4`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <ModeBadge mode="in-person" size="md" /> <span className="opacity-80">{campusName(e.campusCode)}</span>
      </div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{e.room ? `Building ${e.room.building}` : e.location}</div>
      {e.room && (
        <div className="text-sm opacity-80">
          Level {e.room.level} · Room {e.room.room} <span className="font-mono text-xs opacity-70">({e.location})</span>
        </div>
      )}
      {was !== undefined && <div className="mt-2"><RoomChanged was={was} /></div>}
      {e.room && (
        <div className="mt-auto pt-3">
          <a href={directionsUrl(e.room.building)} target="_blank" rel="noreferrer" className="btn-primary">
            <MapPin width={14} height={14} /> Directions
          </a>
        </div>
      )}
    </div>
  );
}

export function NextClass({ events, roomChanges, checkedAt, offline, checking, onCheck, hueFor, onSelect }: Props) {
  const now = useNow(1000); // live countdown
  const { current, focus, nextOnCampus } = upNext(events, now);
  const changeFor = (e: TimetableEvent) => (sessionKey(e) in roomChanges ? roomChanges[sessionKey(e)] : undefined);

  const status = (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="relative flex size-2">
        {!offline && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />}
        <span className={`relative inline-flex size-2 rounded-full ${offline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      </span>
      <span>
        {offline ? 'Offline · last checked ' : 'Live · rooms checked '}
        {checkedAt ? formatDistanceToNowStrict(checkedAt, { addSuffix: true }) : '…'}
      </span>
      <button type="button" onClick={onCheck} disabled={checking} className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium whitespace-nowrap text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
        <Refresh width={12} height={12} className={checking ? 'animate-spin motion-reduce:animate-none' : ''} />
        Check now
      </button>
    </div>
  );

  if (!focus) {
    return (
      <section aria-label="Next class" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Next class</Label>
          {status}
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">No more classes this term</p>
      </section>
    );
  }

  const isNow = focus === current;
  const msLeft = (isNow ? focus.end : focus.start).getTime() - now.getTime();
  const progress = isNow ? (now.getTime() - focus.start.getTime()) / (focus.end.getTime() - focus.start.getTime()) : 0;
  const showNextBuilding = nextOnCampus && nextOnCampus !== focus;

  return (
    <section
      aria-label={isNow ? 'Class happening now' : 'Next class'}
      className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      style={{ '--h': hueFor(focus.unitCode) } as CSSProperties}
    >
      <div className="unit-band h-1.5" aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 sm:px-6">
        <Label>{isNow ? 'Happening now' : 'Next class'}</Label>
        {status}
      </div>

      <div className="grid gap-5 px-5 pt-3 pb-5 sm:px-6 lg:grid-cols-[1.35fr_0.85fr_1.1fr] lg:items-stretch">
        {/* What */}
        <button type="button" onClick={() => onSelect(focus)} className="min-w-0 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500">
          <div className="flex items-center gap-2" style={{ '--h': hueFor(focus.unitCode) } as CSSProperties}>
            <span className="unit-dot size-2.5 rounded-full" />
            <span className="text-sm font-bold tracking-tight">{focus.unitCode}</span>
            <span className={`${cardClass(focus.mode)} rounded-md px-0.5`}>
              <span className={pillClass(focus.activity)}>{focus.activity}</span>
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{focus.activityLabel}</span>
            <ModeBadge mode={focus.mode} />
          </div>
          <h2 className="mt-2 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{focus.unitName}</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {fmt(focus.start, 'EEEE d MMMM')} · <span className="tabular-nums">{fmtTime(focus.start)}–{fmtTime(focus.end)}</span>
          </p>
        </button>

        {/* When */}
        <div className="flex flex-col justify-center" aria-live="off">
          <Label>{isNow ? 'Ends in' : 'Starts in'}</Label>
          <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{liveCountdown(msLeft)}</div>
          {isNow ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Class progress">
              <div className="unit-band h-full rounded-full" style={{ width: `${Math.min(100, progress * 100)}%` }} />
            </div>
          ) : (
            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">at {fmtTime(focus.start)}</div>
          )}
        </div>

        {/* Where */}
        <WherePanel event={focus} was={changeFor(focus)} />
      </div>

      {showNextBuilding && (
        <button
          type="button"
          onClick={() => onSelect(nextOnCampus)}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3 text-left text-sm transition hover:bg-zinc-100 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-500 dark:text-zinc-400">
            <MapPin width={15} height={15} className={MODE_ICON_COLOR['in-person']} /> Next building
          </span>
          <span className="font-semibold">{nextOnCampus.room ? `Building ${nextOnCampus.room.building}` : nextOnCampus.location}</span>
          {nextOnCampus.room && (
            <span className="text-zinc-600 dark:text-zinc-300">
              Level {nextOnCampus.room.level} · Room {nextOnCampus.room.room}
            </span>
          )}
          {changeFor(nextOnCampus) !== undefined && <RoomChanged was={changeFor(nextOnCampus)!} />}
          <span className="text-zinc-500 dark:text-zinc-400">
            {nextOnCampus.unitCode} {nextOnCampus.activityLabel} · {fmt(nextOnCampus.start, 'EEE d MMM')} at {fmtTime(nextOnCampus.start)} ({countdown(nextOnCampus.start.getTime() - now.getTime())})
          </span>
        </button>
      )}
    </section>
  );
}
