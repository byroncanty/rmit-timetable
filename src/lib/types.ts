import type { DeliveryMode } from './delivery';

export type Activity = 'LEC' | 'TUT' | 'PRA' | (string & {});

export interface Room {
  building: string;
  level: string;
  room: string;
  label: string; // "Bldg 57 · Lvl 6 · Rm 002"
}

export interface TimetableEvent {
  uid: string;
  start: Date; // local time
  end: Date;
  unitCode: string; // "ICTPRG430"
  unitShortName: string; // "AppInroOOPLangSkills"
  unitName: string; // friendly name, falling back to the short name
  activity: Activity; // "LEC"
  activityLabel: string; // "Lecture"
  group: string; // "01"
  location: string | null; // room code, null when "-"
  mode: DeliveryMode; // in person (has a room) or online (Canvas)
  room?: Room;
  staff: string | null;
  courseCode?: string; // "COSC7391C"
  campusCode?: string; // "AUSCY", from the offering code
  raw: { summary: string; description: string };

  // Derived in Melbourne time, for layout.
  classKey: string; // unit|activity|group, identifies the recurring class
  dateKey: string; // "2026-09-02"
  weekKey: string; // Monday of that week, "2026-08-31"
  weekday: number; // 1 = Monday … 7 = Sunday
  startMin: number; // minutes since midnight
  endMin: number;
}

/** A positioned block in a grid or agenda: either one real session or a typical-week template. */
export interface GridItem {
  id: string;
  event: TimetableEvent; // the representative session
  weekday: number;
  startMin: number;
  endMin: number;
  badge?: string;
  subtitle?: string;
}
