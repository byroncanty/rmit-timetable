import type { CSSProperties } from 'react';
import { activityLabel } from '../lib/parseSummary';
import { pillClass } from './EventCard';

interface Props {
  activities: string[];
  units: { code: string; name: string; title: string }[]; // name: short key label, title: tooltip
  hueFor: (code: string) => number;
}

/** The timetable's key: activity pills and unit colours. */
export function Key({ activities, units, hueFor }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Key</span>

      <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-300" style={{ '--h': 260 } as CSSProperties}>
        {activities.map((a) => (
          <span key={a} className="flex items-center gap-1.5">
            <span className="unit-card rounded px-0.5">
              <span className={pillClass(a)}>{a}</span>
            </span>
            {activityLabel(a)}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-300">
        {units.map((u) => (
          <span key={u.code} className="flex items-center gap-1.5" title={u.title} style={{ '--h': hueFor(u.code) } as CSSProperties}>
            <span className="unit-dot size-2.5 rounded-full" />
            {u.name}
          </span>
        ))}
      </div>
    </div>
  );
}
