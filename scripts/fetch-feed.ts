// Fetch the iCal feed at ICAL_URL and save it as a static file, e.g. for GitHub Pages:
//   ICAL_URL=… node scripts/fetch-feed.ts dist/timetable.ics
import { writeFile } from 'node:fs/promises';
import { proxyIcal } from '../server/fetchIcal.ts';

const out = process.argv[2] ?? 'dist/timetable.ics';
const r = await proxyIcal(process.env.ICAL_URL);
if (r.status !== 200) {
  console.error(`Feed fetch failed (${r.status}): ${r.body}`);
  process.exit(1);
}
await writeFile(out, r.body);
console.log(`Saved ${r.body.match(/BEGIN:VEVENT/g)?.length ?? 0} events to ${out}`);
