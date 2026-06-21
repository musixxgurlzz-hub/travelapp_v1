# My Trips — Japan 2026 Checklist

A mobile-first, offline-capable trip itinerary and checklist PWA. Currently focused on a
2-person Japan trip (Kyoto · Osaka · Okinawa · Kobe), June 24–30, 2026. Built to be
**multi-trip** — add future trips to `data.js` and they appear automatically.

## Features

- **Day-by-day itinerary** in collapsible accordion cards
- **Tap-to-check** checklist items with a circular checkbox
- **Progress tracking** — overall progress bar + per-day completion badge (`5/9`, `✓ done`)
- **Per-device persistence** via `localStorage` — your checks survive reloads
- **Offline-capable** — a service worker caches all assets; works with no connection once loaded
- **Add to Home Screen** — installs as a standalone app (manifest + icons)
- **Per-day weather pills** and **rain contingency plans**
- **Flight-time warning box** for the flagged Naha → Kobe Scoot ticket discrepancy
- **Special Okinawa block** — family-hosted days render as a simple flight/date summary, no checklist
- **Category tags** per item: transport · food · activity · shopping · tip
- **Estimate vs actual budget** — each spend item has an "actual" amount box next to its
  estimate; per-day (under the date) and trip-wide totals recalc live and turn red when actual
  exceeds estimate. Actuals are stored separately (`trip:<id>:actuals`) so they survive
  itinerary updates
- **Reset button** with confirmation, scoped per trip
- **Mark trip complete** — add notes, then move the trip into history (reopen any time to undo)
- **Trip history** section for past trips (notes + checked state preserved)
- **Add / upload trips** — import a trip from a `.json` file or pasted JSON; **Export** any trip
  as JSON to use as a template for the next one
- **In-app editing** — edit, add, and delete items and day details (enabled when online; the
  checklist stays usable offline)
- **Editable trip location title** and details

## Tech

Pure HTML/CSS/vanilla JS — **no build step, no dependencies, no backend.** Trips are seeded
from `data.js`, then persisted to and edited in `localStorage` per device (see `store.js`).
This keeps it free to host, fully offline, and zero-maintenance.

### Cross-device sync (optional backend)

When configured, the app syncs all state (checks, actuals, edits, history) across devices via
a single Upstash Redis document keyed by an unguessable **space id**:

- `api/state.js` — Vercel serverless function (`GET`/`PUT`), zero npm deps, talks to the
  Upstash REST API. Version-guarded last-write-wins.
- `sync.js` — client engine: pulls on load, debounced push on change, polls every 15s while
  visible; falls back to localStorage when offline or the backend is absent.
- **Pairing:** the **🔗 Sync** button shows a link containing the space id — open it on the
  second device (`#space=…`) to join. No accounts. Anyone with the link can view/edit.

**Provision** (one-time): `vercel integration add upstash/upstash-kv` (accept marketplace
terms in the browser first), then `vercel env pull`. The function reads
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` / `KV_REST_API_TOKEN`).

Without those env vars the function returns 503 and the app stays fully functional per-device.

The service worker is **network-first** for HTML/JS/CSS so published updates apply as soon as
a device is online, with the cache as the offline fallback. Bump `SEED_REV` in `data.js` when
you edit the published itinerary so unedited devices pick up the new data.

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `data.js` | Seed trip data (`TRIPS` + `CURRENT_TRIP_ID` + `SEED_REV`) |
| `store.js` | localStorage-backed trip store (seed, edit, complete, import/export) |
| `app.js` | Rendering, checklist, edit mode, add/complete UI |
| `styles.css` | Mobile-first styling (max-width 600px) |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (offline cache) |
| `icons/` | App icons (SVG + 192/512 PNG) |
| `vercel.json` | Static hosting headers |

## Run locally

No tooling required beyond Python (preinstalled on macOS):

```bash
python3 -m http.server 5173
# then open http://localhost:5173
```

## Deploy (Vercel)

This is a static site — no framework preset needed.

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework Preset: **Other**. Build Command: *(leave empty)*. Output Directory: *(leave empty / root)*.
4. Deploy. Open the URL on each phone and **Add to Home Screen** for an app-like, offline experience.

`vercel.json` sets correct caching headers for the service worker and manifest.

## Editing the trip

All content lives in `data.js`:

- Each **trip** has `meta` (budget, hotels, payment) and a `days` array.
- Each **day** has `emoji`, `name`, `dateLabel`, `weather`, `weatherClass` (`clear` | `mixed`),
  optional `rainPlan`, optional `flightWarning`, and `items`.
- Each **item** has `time`, `label`, `note`, `price`, and `tag`.
- The Okinawa-style block uses `isOkinawa: true` + `okinawaRows` instead of `items`.
- Switch which trip is in focus with `CURRENT_TRIP_ID`; set a trip's `status` to `past` to
  move it into Trip history.

> Times, prices, and venue choices come from real trip research — treat `data.js` as the
> source of truth to edit deliberately, not to regenerate.
