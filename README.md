# Weekly Timetable

A personal Monday–Thursday timetable built from my RMIT **myTimetable** iCal feed.

- **Week grid** (Mon–Thu): classes sized by duration, a "now" line, and teaching-week numbers. From Friday it opens on the coming week.
- **In person vs online:** in-person classes (Melbourne City campus, with a room) are solid cards with a map pin. Online classes (Canvas) are striped cards with a dashed edge and a laptop icon.
- **Key** above the timetable: the two delivery categories (click to show or hide each one), activity pills (Lecture / Tutorial / Practical) and unit colours
- **Typical week:** the whole term collapsed into one repeating week, with badges for skipped or moved sessions
- **Agenda:** a day-by-day list. Phones get one day at a time with tabs and swipe.
- Detail drawer showing delivery, campus and room (or a Canvas link), plus every session of that class
- **Next class** panel at the top: a live countdown, and where to go. That's the building, level and room with a Directions link, or Canvas for online classes.
  If the next class is online (or one is in progress), it also shows the **next building**: the next class that's on campus.
- **Active room check:** the app re-checks the feed every 10 minutes, when the tab comes back into view after 5 minutes away, or with "Check now".
  If an upcoming session's room changes from the one first seen, it's flagged "Room changed · was …".
- Unit and activity filters, editable unit names, light/dark theme, print and PNG export, offline copy

## How in person / online is worked out

The feed has no separate campus or delivery field. Every class's offering code ends in `AUSCY` (City campus),
including the online ones, so that code can't tell them apart. What does is the room (`LOCATION`): classes
with a room code like `057.06.002` are in person, and classes with `-` run on Canvas. The campus code is
still used to name the campus for in-person classes (`AUSCY` → Melbourne City campus).

## Run locally

```bash
cp .env.example .env    # then put the iCal URL in ICAL_URL
npm install
npm run dev             # http://localhost:5173
npm test                # Vitest unit tests
```

The myTimetable server doesn't send CORS headers, so the browser can't fetch the feed directly.
The app always reads `timetable.ics` next to the page:

- **Dev:** Vite serves `/timetable.ics` by fetching `ICAL_URL` live (`vite.config.ts`).
- **GitHub Pages:** a scheduled GitHub Action fetches the feed and publishes it as a static file.
- **Vercel (alternative):** `vercel.json` rewrites `/timetable.ics` to the `api/timetable` function.

Times are read exactly as written in the feed (Melbourne time). There's no timezone conversion.

## Deploy to GitHub Pages (free)

1. Create a GitHub repository (public: free Pages needs a public repo) and push this folder to `main`.
2. **Settings → Secrets and variables → Actions → New repository secret:** name it `ICAL_URL` and paste the iCal link.
3. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
4. **Actions → Deploy to GitHub Pages → Run workflow** (or just push). The site goes live at
   `https://<username>.github.io/<repo>/`.

`.github/workflows/deploy.yml` runs on every push and **every 30 minutes**, re-fetching the feed, so room
changes show up within about half an hour. It also makes an empty commit every 45 days, because GitHub
pauses scheduled workflows in repos with no commits for 60 days.

> **Privacy:** the iCal link stays secret (it's only in the Actions secret), but the published site and its
> `timetable.ics`, plus `src/lib/__fixtures__/feed.ics` in a public repo, show the timetable to anyone who
> finds them: classes, rooms and times.

## Use it on an iPhone

**As an app (recommended):** open the site in **Safari**, tap **Share → Add to Home Screen**, then **Add**.
It opens full-screen from its own icon like an app. After the first visit it keeps working offline with the
last downloaded timetable. Directions open in Apple Maps.

**Straight from this Mac on the same Wi-Fi** (no deploy; the Mac has to be on and running it):

```bash
npm run dev -- --host
```

Open the `Network:` address it prints (e.g. `http://192.168.1.20:5173`) in Safari on the iPhone.
Offline mode doesn't work this way, because iOS only allows service workers over https.

## Structure

```
api/timetable.ts         Vercel function: GET returns the feed at ICAL_URL
scripts/fetch-feed.ts    saves the feed as a static file (used by the GitHub Pages workflow)
.github/workflows/       deploy.yml: build + fetch feed + publish to GitHub Pages every 30 min
public/                  icons, manifest.webmanifest and sw.js for the home-screen app
server/fetchIcal.ts      shared proxy logic (timeout, size limit, cache headers)
src/lib/ical.ts          ical.js → TimetableEvent[]
src/lib/parseSummary.ts  summary → unit / name / activity / group; description → course + campus code
src/lib/delivery.ts      in person vs online (Canvas), campus names, Canvas + directions links
src/lib/nextClass.ts     current / next class, next building, room-change check
src/lib/rooms.ts         "057.06.002" → Bldg 57 · Lvl 6 · Rm 002
src/lib/weeks.ts         Mon–Thu weeks, teaching weeks, typical-week grouping, grid range
src/lib/layout.ts        overlap column layout
src/lib/units.ts         friendly unit names + colour assignment
src/lib/feed.ts          fetching, local cache, offline fallback
src/components/          NextClass, WeekGrid, EventCard, Key, EventDrawer, AgendaView, Filters
```
