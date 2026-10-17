import type { CSSProperties } from 'react';
import { DELIVERY, MODES, type DeliveryMode } from '../lib/delivery';
import { activityLabel } from '../lib/parseSummary';
import { ModeBadge, pillClass } from './EventCard';

interface Props {
  counts: Record<DeliveryMode, number>; // classes shown in the current view
  hiddenModes: DeliveryMode[];
  onToggleMode: (mode: DeliveryMode) => void;
  activities: string[];
  units: { code: string; name: string }[];
  hueFor: (code: string) => number;
}

/** The timetable's key: delivery categories (toggleable), activity pills and unit colours. */
export function Key({ counts, hiddenModes, onToggleMode, activities, units, hueFor }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Key</span>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show in-person or online classes">
        {MODES.map((m) => {
          const shown = !hiddenModes.includes(m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={shown}
              onClick={() => onToggleMode(m)}
              title={shown ? `Hide ${DELIVERY[m].label.toLowerCase()} classes` : `Show ${DELIVERY[m].label.toLowerCase()} classes`}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 transition ${shown ? 'border-zinc-200 dark:border-zinc-700' : 'border-dashed border-zinc-300 opacity-45 dark:border-zinc-700'} hover:bg-zinc-50 dark:hover:bg-zinc-800`}
            >
              <ModeBadge mode={m} />
              <span className={`key-swatch h-4 w-6 rounded ${m === 'online' ? 'is-online' : ''}`} aria-hidden />
              <span className={`font-semibold ${shown ? '' : 'line-through'}`}>{DELIVERY[m].label}</span>
              <span className="text-zinc-500 dark:text-zinc-400">{DELIVERY[m].place}</span>
              <span className="rounded-full bg-zinc-100 px-1.5 font-semibold tabular-nums dark:bg-zinc-800">{counts[m]}</span>
            </button>
          );
        })}
      </div>

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
          <span key={u.code} className="flex items-center gap-1.5" title={u.name} style={{ '--h': hueFor(u.code) } as CSSProperties}>
            <span className="unit-dot size-2.5 rounded-full" />
            {u.code}
          </span>
        ))}
      </div>
    </div>
  );
}
