// Storage layer for My Trips.
//
// Trips are seeded from data.js (TRIPS / CURRENT_TRIP_ID / SEED_REV) on first
// load, then persisted to localStorage and treated as the editable source of
// truth. Published itinerary updates (a new SEED_REV pushed via data.js) still
// flow through to any trip the user has NOT edited in-app, so the
// "edit data.js -> git push -> Vercel" workflow keeps working.
//
// Per-device only: there is no backend, so edits/history live on this device.
const Store = (() => {
  const TRIPS_KEY = 'mytrips:trips:v2';
  const CURRENT_KEY = 'mytrips:current:v2';
  const INTERNAL = ['source', 'seedRev', 'edited'];

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const seedRev = () => (typeof SEED_REV === 'number' ? SEED_REV : 1);

  // In-memory cache so every read returns the SAME object instances. Without
  // this, re-parsing localStorage on each getTrips() hands out fresh objects,
  // and edits made through different closures clobber each other on save.
  let _cache = null;

  function readTrips() {
    try {
      const v = JSON.parse(localStorage.getItem(TRIPS_KEY));
      return Array.isArray(v) ? v : null;
    } catch { return null; }
  }
  function writeTrips(trips) {
    _cache = trips;
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    try { window.dispatchEvent(new Event('mytrips:changed')); } catch {}
    return trips;
  }

  // ---- sync serialization ----
  // All app state lives in localStorage under these prefixes. Device-local
  // keys (the sync space id and sync bookkeeping) are excluded so they never
  // travel between paired devices.
  const SYNC_PREFIXES = ['mytrips:', 'trip:'];
  const isSyncable = (k) => SYNC_PREFIXES.some((p) => k.startsWith(p))
    && k !== 'mytrips:space' && !k.startsWith('mytrips:sync:');

  function serialize() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isSyncable(k)) data[k] = localStorage.getItem(k);
    }
    return data;
  }
  function hydrate(data) {
    if (!data || typeof data !== 'object') return;
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isSyncable(k)) remove.push(k);
    }
    remove.forEach((k) => localStorage.removeItem(k));
    Object.entries(data).forEach(([k, v]) => { if (typeof v === 'string') localStorage.setItem(k, v); });
    _cache = null; // force reload from the newly hydrated data
  }

  // Seed on first run; otherwise refresh unedited seed trips when data.js is newer.
  function ensureSeeded() {
    let trips = readTrips();
    const seeds = (typeof TRIPS !== 'undefined' && Array.isArray(TRIPS)) ? TRIPS : [];

    if (!trips) {
      trips = seeds.map((t) => Object.assign(clone(t), {
        status: t.status || 'upcoming', notes: '', completedAt: null,
        source: 'seed', seedRev: seedRev(), edited: false,
      }));
      writeTrips(trips);
      if (!localStorage.getItem(CURRENT_KEY)) {
        const cur = (typeof CURRENT_TRIP_ID !== 'undefined' && CURRENT_TRIP_ID) || (trips[0] && trips[0].id);
        if (cur) localStorage.setItem(CURRENT_KEY, cur);
      }
      return trips;
    }

    let changed = false;
    const byId = Object.fromEntries(trips.map((t) => [t.id, t]));
    for (const seed of seeds) {
      const ex = byId[seed.id];
      if (!ex) {
        trips.push(Object.assign(clone(seed), {
          status: seed.status || 'upcoming', notes: '', completedAt: null,
          source: 'seed', seedRev: seedRev(), edited: false,
        }));
        changed = true;
      } else if (ex.source === 'seed' && !ex.edited && (ex.seedRev || 0) < seedRev()) {
        // Refresh content from the newer seed, but keep user-owned state.
        const keep = { status: ex.status, notes: ex.notes, completedAt: ex.completedAt };
        Object.keys(ex).forEach((k) => delete ex[k]);
        Object.assign(ex, clone(seed), keep, { source: 'seed', seedRev: seedRev(), edited: false });
        changed = true;
      }
    }
    if (changed) writeTrips(trips);
    return trips;
  }

  function getTrips() {
    if (_cache) return _cache;
    _cache = ensureSeeded();
    return _cache;
  }
  const getTrip = (id) => getTrips().find((t) => t.id === id) || null;

  function getCurrentId() {
    const trips = getTrips();
    const stored = localStorage.getItem(CURRENT_KEY);
    if (stored && trips.some((t) => t.id === stored)) return stored;
    const active = trips.find((t) => t.status !== 'past');
    return active ? active.id : (trips[0] ? trips[0].id : null);
  }
  function setCurrentId(id) { localStorage.setItem(CURRENT_KEY, id); }

  // Replace a trip and mark it as locally edited (stops seed auto-refresh).
  function saveTrip(trip) {
    const trips = getTrips();
    const i = trips.findIndex((t) => t.id === trip.id);
    trip.edited = true;
    trip.source = 'local';
    if (i >= 0) trips[i] = trip; else trips.push(trip);
    return writeTrips(trips) && trip;
  }
  function updateTrip(id, patch) {
    const t = getTrip(id);
    if (!t) return null;
    return saveTrip(Object.assign(t, patch));
  }

  function completeTrip(id, notes) {
    return updateTrip(id, { status: 'past', completedAt: new Date().toISOString(), notes: notes || '' });
  }
  function reopenTrip(id) {
    const t = updateTrip(id, { status: 'active', completedAt: null });
    if (t) setCurrentId(id);
    return t;
  }
  function removeTrip(id) {
    const trips = getTrips().filter((t) => t.id !== id);
    writeTrips(trips);
    localStorage.removeItem(`trip:${id}:checked`);
    localStorage.removeItem(`trip:${id}:open-days`);
    if (getCurrentId() === id && trips[0]) setCurrentId(trips.find((t) => t.status !== 'past')?.id || trips[0].id);
  }

  function exportTrip(id) {
    const t = getTrip(id);
    if (!t) return null;
    const out = clone(t);
    INTERNAL.concat(['status', 'completedAt', 'notes']).forEach((k) => delete out[k]);
    return out;
  }

  const slug = (s) => String(s || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'trip';

  // Validate + normalize an uploaded/pasted trip object. Lenient: fills
  // sensible defaults and generates ids so a hand-authored JSON still imports.
  function normalizeImport(raw) {
    const errors = [];
    let obj = raw;
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw); } catch (e) { return { ok: false, errors: ['Not valid JSON: ' + e.message] }; }
    }
    if (Array.isArray(obj)) obj = obj[0];
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['Expected a trip object.'] };

    const dest = obj.destination || obj.locationTitle || obj.name;
    if (!dest) errors.push('Missing "destination" (trip location title).');
    if (!Array.isArray(obj.days) || !obj.days.length) errors.push('Missing "days" array.');
    if (errors.length) return { ok: false, errors };

    const existing = new Set(getTrips().map((t) => t.id));
    let id = obj.id || slug(dest);
    while (existing.has(id)) id = `${slug(dest)}-${Math.random().toString(36).slice(2, 6)}`;

    const validTags = new Set(['transport', 'food', 'activity', 'shopping', 'tip']);
    const days = obj.days.map((d, di) => {
      const day = {
        id: d.id || `d${di + 1}`,
        emoji: d.emoji || '📅',
        name: d.name || `Day ${di + 1}`,
        dateLabel: d.dateLabel || '',
        weather: d.weather || '',
        weatherClass: d.weatherClass === 'clear' ? 'clear' : 'mixed',
        rainPlan: d.rainPlan || '',
        flightWarning: d.flightWarning || '',
      };
      if (d.isOkinawa || d.summaryRows || d.okinawaRows) {
        day.isOkinawa = true;
        day.okinawaRows = (d.okinawaRows || d.summaryRows || []).map((r) => ({ time: r.time || '', text: r.text || '' }));
        day.items = [];
      } else {
        day.items = (d.items || []).map((it, ii) => ({
          id: it.id || `${day.id}i${ii + 1}`,
          time: it.time || '',
          label: it.label || '(untitled)',
          note: it.note || '',
          price: it.price || '—',
          tag: validTags.has(it.tag) ? it.tag : 'activity',
        }));
      }
      return day;
    });

    const trip = {
      id,
      destination: dest,
      subtitle: obj.subtitle || '',
      dateRange: obj.dateRange || '',
      flag: obj.flag || '🧳',
      status: 'upcoming',
      notes: '', completedAt: null,
      meta: obj.meta || null,
      days,
      source: 'local', seedRev: seedRev(), edited: true,
    };
    return { ok: true, errors: [], trip };
  }

  function addTrip(raw, { focus = true } = {}) {
    const res = normalizeImport(raw);
    if (!res.ok) return res;
    const trips = getTrips();
    trips.push(res.trip);
    writeTrips(trips);
    if (focus) setCurrentId(res.trip.id);
    return res;
  }

  function countCheckable(trip) {
    return (trip.days || []).filter((d) => !d.isOkinawa).reduce((n, d) => n + d.items.length, 0);
  }

  return {
    getTrips, getTrip, getCurrentId, setCurrentId,
    saveTrip, updateTrip, completeTrip, reopenTrip, removeTrip,
    exportTrip, normalizeImport, addTrip, countCheckable, slug,
    serialize, hydrate,
  };
})();
