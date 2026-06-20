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
- **Reset button** with confirmation, scoped per trip
- **Trip history** section for past trips (checked state preserved)

## Tech

Pure HTML/CSS/vanilla JS — **no build step, no dependencies, no backend.** State lives in
`localStorage` per device. This keeps it free to host, fully offline, and zero-maintenance.

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `data.js` | All trip data (`TRIPS` array + `CURRENT_TRIP_ID`) — the source of truth |
| `app.js` | Rendering + checklist/persistence logic |
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
