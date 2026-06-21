// Cross-device sync engine. Mirrors all app state (trips, checks, actuals,
// open-days, history) to /api/state, keyed by an unguessable "space" id shared
// between paired devices. Progressive enhancement: if the backend isn't
// configured or the device is offline, the app keeps working from localStorage.
//
// Model: whole-document, version-guarded last-write-wins. The client pushes its
// state tagged with the last version it saw; if the server has moved on it
// returns 409 + the current doc and the client adopts that (converges). Polls
// every 15s while visible so the two devices stay close. Good enough for a
// 2-person trip; near-simultaneous edits to the same field can drop one side.
(() => {
  const API = './api/state';
  const SPACE_KEY = 'mytrips:space';
  const VER_KEY = 'mytrips:sync:version';
  const POLL_MS = 15000;

  function genId() {
    const a = new Uint8Array(16);
    (crypto || window.crypto).getRandomValues(a);
    return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Adopt a space id from the pairing link (#space=...) if present, else reuse
  // this device's id, else generate one.
  function resolveSpace() {
    const m = location.hash.match(/space=([A-Za-z0-9_-]{8,64})/);
    if (m) {
      localStorage.setItem(SPACE_KEY, m[1]);
      localStorage.removeItem(VER_KEY); // joining a space: take whatever the server has
      history.replaceState(null, '', location.pathname + location.search);
    }
    let s = localStorage.getItem(SPACE_KEY);
    if (!s) { s = genId(); localStorage.setItem(SPACE_KEY, s); }
    return s;
  }

  const space = resolveSpace();
  let version = Number(localStorage.getItem(VER_KEY) || 0);
  let status = 'idle';
  let busy = false, pending = false;

  function setStatus(s) {
    status = s;
    try { window.dispatchEvent(new CustomEvent('mytrips:sync-status', { detail: s })); } catch {}
  }
  const setVersion = (v) => { version = v; localStorage.setItem(VER_KEY, String(v)); };
  const rerender = () => { if (window.__renderApp) window.__renderApp(); };

  async function pull() {
    if (!navigator.onLine) { setStatus('offline'); return; }
    try {
      setStatus('syncing');
      const r = await fetch(`${API}?space=${encodeURIComponent(space)}`, { cache: 'no-store' });
      if (r.status === 503) { setStatus('disabled'); return; }
      if (!r.ok) throw new Error(r.status);
      const doc = await r.json();
      if (doc && doc.state && doc.version > version) {
        Store.hydrate(doc.state); setVersion(doc.version); rerender();
      } else if (doc && (doc.version || 0) === 0) {
        await push(); // server empty — seed it with this device's state
        return;
      }
      setStatus('synced');
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }

  async function push() {
    if (!navigator.onLine) { setStatus('offline'); pending = true; return; }
    if (busy) { pending = true; return; }
    busy = true; pending = false;
    try {
      setStatus('syncing');
      const body = JSON.stringify({ state: Store.serialize(), baseVersion: version });
      const r = await fetch(`${API}?space=${encodeURIComponent(space)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
      });
      if (r.status === 503) { setStatus('disabled'); return; }
      if (r.status === 409) {
        const cur = await r.json();
        if (cur && cur.state) { Store.hydrate(cur.state); setVersion(cur.version); rerender(); }
        setStatus('synced');
      } else if (r.ok) {
        const j = await r.json(); setVersion(j.version); setStatus('synced');
      } else { throw new Error(r.status); }
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline'); pending = true;
    } finally {
      busy = false;
      if (pending) setTimeout(push, 1200);
    }
  }

  let pushTimer = null;
  const schedulePush = () => { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1000); };

  window.addEventListener('mytrips:changed', schedulePush);
  window.addEventListener('online', () => { pull(); });
  window.addEventListener('offline', () => setStatus('offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
  setInterval(() => { if (document.visibilityState === 'visible' && !busy) pull(); }, POLL_MS);

  window.Sync = {
    pull, push, status: () => status,
    getSpace: () => space,
    pairLink: () => `${location.origin}${location.pathname}#space=${space}`,
  };

  pull();
})();
