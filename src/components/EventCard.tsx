import type { CSSProperties } from 'react';
import { DELIVERY, whereShort, type DeliveryMode } from '../lib/delivery';
import { minToLabel } from '../lib/time';
import type { GridItem, TimetableEvent } from '../lib/types';
import { Laptop, MapPin } from './icons';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const pillClass = (activity: string) => `pill ${['LEC', 'TUT', 'PRA'].includes(activity) ? `pill-${activity}` : 'pill-TUT'}`;
export const cardClass = (mode: DeliveryMode) => `unit-card${mode === 'online' ? ' is-online' : ''}`;

export function ariaLabel(item: GridItem): string {
  const e = item.event;
  const where = e.mode === 'online' ? 'online on Canvas' : `in person, room ${e.location}`;
  return `${DAYS[item.weekday]} ${minToLabel(item.startMin)} to ${minToLabel(item.endMin)}, ${e.unitCode} ${e.activityLabel}, ${where}`;
}

// Fixed category colours, independent of unit colours: green = on campus, purple = Canvas.
const MODE_BADGE: Record<DeliveryMode, { text: string; className: string }> = {
  'in-person': { text: 'Campus', className: 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950' },
  online: { text: 'Canvas', className: 'bg-violet-700 text-white dark:bg-violet-300 dark:text-violet-950' },
};
export const MODE_ICON_COLOR: Record<DeliveryMode, string> = {
  'in-person': 'text-emerald-700 dark:text-emerald-400',
  online: 'text-violet-700 dark:text-violet-300',
};

/**
 * Solid category badge: map pin + "Campus" or laptop + "Canvas".
 * `iconOnly` always hides the label; `responsive` hides it when the surrounding @container is narrow.
 */
export function ModeBadge({
  mode,
  iconOnly = false,
  responsive = false,
  size = 'sm',
  className = '',
}: {
  mode: DeliveryMode;
  iconOnly?: boolean;
  responsive?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const Icon = mode === 'online' ? Laptop : MapPin;
  const b = MODE_BADGE[mode];
  const md = size === 'md';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${md ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-px text-[10px]'} ${b.className} ${className}`}
      title={mode === 'online' ? 'Online class on Canvas' : 'In-person class on campus'}
    >
      <Icon width={md ? 13 : 11} height={md ? 13 : 11} strokeWidth={2.5} />
      <span className={iconOnly ? 'sr-only' : responsive ? 'sr-only @[12rem]:not-sr-only' : ''}>{b.text}</span>
    </span>
  );
}

/** Icon + room (in person) or "Canvas" (online). */
export function WhereTag({ event: e, className = '' }: { event: TimetableEvent; className?: string }) {
  const Icon = e.mode === 'online' ? Laptop : MapPin;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`} title={`${DELIVERY[e.mode].label}: ${whereShort(e.mode, e.location, e.room)}`}>
      <Icon width={12} height={12} className={`shrink-0 ${MODE_ICON_COLOR[e.mode]}`} />
      <span className="truncate">{whereShort(e.mode, e.location, e.room)}</span>
    </span>
  );
}

interface Props {
  item: GridItem;
  hue: number;
  onSelect: (item: GridItem) => void;
  style?: CSSProperties;
  className?: string;
}

export function EventCard({ item, hue, onSelect, style, className = '' }: Props) {
  const e = item.event;
  const duration = item.endMin - item.startMin;
  const compact = duration < 60;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={ariaLabel(item)}
      style={{ ...style, '--h': hue } as CSSProperties}
      className={`${cardClass(e.mode)} group @container flex flex-col overflow-hidden rounded-xl border-l-4 px-2.5 py-1.5 text-left shadow-sm ring-1 ring-black/5 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:ring-white/10 ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="shrink-0 text-xs font-bold tracking-tight">{e.unitCode}</span>
        <span className={`${pillClass(e.activity)} shrink-0`}>
          {e.activity}
          {e.group && <span className="ml-0.5 opacity-70">{e.group}</span>}
        </span>
        <ModeBadge mode={e.mode} iconOnly={compact} responsive className="ml-auto" />
      </div>
      {!compact && <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug font-medium">{e.unitName}</div>}
      <div className="mt-auto pt-0.5 text-[11px] leading-tight opacity-80">
        <span className="block tabular-nums">
          {minToLabel(item.startMin)}–{minToLabel(item.endMin)}
        </span>
        {!compact && <WhereTag event={e} className="max-w-full font-medium" />}
        {item.subtitle && duration >= 90 && <span className="block truncate opacity-80">{item.subtitle}</span>}
        {item.badge && <span className="mt-0.5 inline-block rounded bg-amber-400/90 px-1 text-[9px] font-semibold text-amber-950">{item.badge}</span>}
      </div>
    </button>
  );
}
