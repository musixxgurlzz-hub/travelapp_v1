(() => {
  const APP_NAME = 'My Trips';

  // ---- transient UI state (not persisted) ----
  const ui = { editing: false, donePanel: false, addPanel: false, addError: '', syncPanel: false, copied: false };

  const SYNC_LABELS = { idle: 'Connecting…', syncing: 'Syncing…', synced: 'Synced ✓', offline: 'Offline — saved on this device', error: 'Sync unavailable — saved on this device', disabled: 'Saved on this device' };
  const syncStatus = () => (window.Sync ? window.Sync.status() : 'disabled');
  const syncFooterText = () => `${SYNC_LABELS[syncStatus()] || 'Saved on this device'} · works offline`;

  // ---- per-trip ephemeral state (checked items, open accordions) ----
  const tripKey = (tripId, kind) => `trip:${tripId}:${kind}`;
  const loadSet = (key) => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { return new Set(); }
  };
  const markChanged = () => { try { window.dispatchEvent(new Event('mytrips:changed')); } catch {} };
  const saveSet = (key, set) => { localStorage.setItem(key, JSON.stringify([...set])); markChanged(); };

  const root = document.getElementById('app');
  const isOnline = () => navigator.onLine;

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'value') node.value = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  };

  function download(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return ''; }
  };

  // ---- budget helpers ----
  // Estimate prices are free-form ("¥740 for 2", "~¥400–600 for 2", "Free",
  // "Budget as needed"). Parse a representative yen figure: ranges -> midpoint,
  // non-spend strings -> 0. Used only for the *estimate* totals; actuals are
  // clean numbers the user types.
  function parseYen(str) {
    if (!str) return 0;
    const s = String(str).toLowerCase();
    if (/included|refund/.test(s)) return 0;
    if (!/\d/.test(s)) return 0;                 // Free, Paid, —, etc.
    const clean = s.replace(/,/g, '');
    const nums = (clean.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (!nums.length) return 0;
    if (/\d\s*[–-]\s*\d/.test(clean) && nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
    return Math.round(nums[0]);
  }
  // Show an actual-amount box when the item represents real spend.
  const hasSpend = (str) => parseYen(str) > 0 || /budget|as needed/i.test(str || '');

  const loadActuals = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
  const saveActuals = (key, map) => { localStorage.setItem(key, JSON.stringify(map)); markChanged(); };
  const dayEst = (day) => (day.items || []).reduce((s, i) => s + parseYen(i.price), 0);
  const yen = (n) => '¥' + Number(n || 0).toLocaleString();

  // ---------- app + toolbar ----------
  function renderAppHeader() {
    return el('div', { class: 'app-header' }, [
      el('div', { class: 'app-brand' }, [
        el('img', { src: './icons/icon.svg', alt: '', class: 'app-logo' }),
        el('span', { class: 'app-title' }, APP_NAME),
      ]),
      el('div', { class: 'app-subtitle' }, 'Plan, pack, and check off — one trip at a time.'),
    ]);
  }

  function renderToolbar(trip) {
    const row = el('div', { class: 'toolbar' });
    const addBtn = el('button', { class: 'tool-btn', type: 'button' }, '＋ Add trip');
    addBtn.addEventListener('click', () => { ui.addPanel = !ui.addPanel; ui.addError = ''; render(); });
    row.appendChild(addBtn);

    const syncBtn = el('button', { class: `tool-btn${ui.syncPanel ? ' active' : ''}`, type: 'button' }, '🔗 Sync');
    syncBtn.addEventListener('click', () => { ui.syncPanel = !ui.syncPanel; ui.copied = false; render(); });
    row.appendChild(syncBtn);

    if (trip) {
      const editBtn = el('button', {
        class: `tool-btn${ui.editing ? ' active' : ''}`, type: 'button',
        title: isOnline() ? '' : 'Connect to the internet to edit',
      }, ui.editing ? '✓ Done editing' : '✎ Edit');
      editBtn.addEventListener('click', () => {
        if (!ui.editing && !isOnline()) {
          alert('You\'re offline. Connect to the internet to edit the itinerary — the checklist still works offline.');
          return;
        }
        ui.editing = !ui.editing; ui.donePanel = false; render();
      });
      row.appendChild(editBtn);

      const exportBtn = el('button', { class: 'tool-btn', type: 'button' }, '⤓ Export');
      exportBtn.addEventListener('click', () => {
        const data = Store.exportTrip(trip.id);
        if (data) download(`${Store.slug(trip.destination)}.json`, data);
      });
      row.appendChild(exportBtn);
    }
    return row;
  }

  // ---------- sync / pairing ----------
  function renderSyncPanel() {
    const panel = el('div', { class: 'panel sync-panel' });
    panel.appendChild(el('div', { class: 'panel-title' }, 'Sync across devices'));
    const link = window.Sync ? window.Sync.pairLink() : '';
    panel.appendChild(el('div', { class: 'panel-hint' },
      'Open this link on your other phone to share the same checklist, edits, actual amounts, and history. Keep it private — anyone with the link can view and edit this trip.'));

    const input = el('input', { class: 'edit-input', value: link, readonly: 'readonly', 'aria-label': 'Pairing link' });
    input.addEventListener('focus', () => input.select());
    const copy = el('button', { class: 'btn-primary', type: 'button' }, ui.copied ? 'Copied ✓' : 'Copy link');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link); }
      catch { input.focus(); input.select(); try { document.execCommand('copy'); } catch {} }
      ui.copied = true; render();
      setTimeout(() => { ui.copied = false; }, 1800);
    });
    panel.appendChild(el('div', { class: 'sync-link-row' }, [input, copy]));

    const st = syncStatus();
    panel.appendChild(el('div', { class: `sync-status sync-${st}` }, SYNC_LABELS[st] || 'Saved on this device'));

    const close = el('button', { class: 'btn-ghost', type: 'button' }, 'Close');
    close.addEventListener('click', () => { ui.syncPanel = false; render(); });
    panel.appendChild(el('div', { class: 'panel-actions' }, [close]));
    return panel;
  }

  // ---------- add / upload trip ----------
  function renderAddPanel() {
    const panel = el('div', { class: 'panel add-panel' });
    panel.appendChild(el('div', { class: 'panel-title' }, 'Add a trip'));
    panel.appendChild(el('div', { class: 'panel-hint' },
      'Upload a trip JSON file, or paste the JSON below. Tip: use Export on an existing trip to get the exact format to hand to Claude for your next trip.'));

    const ta = el('textarea', { class: 'paste-area', placeholder: '{ "destination": "Bali", "dateRange": "...", "days": [ ... ] }', rows: '6' });

    const file = el('input', { type: 'file', accept: '.json,application/json', class: 'file-input' });
    file.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      f.text().then((txt) => { ta.value = txt; });
    });

    if (ui.addError) panel.appendChild(el('div', { class: 'panel-error' }, ui.addError));

    const fileRow = el('label', { class: 'file-row' }, ['Choose a .json file', file]);
    panel.appendChild(fileRow);
    panel.appendChild(el('div', { class: 'or-divider' }, 'or paste JSON'));
    panel.appendChild(ta);

    const actions = el('div', { class: 'panel-actions' });
    const importBtn = el('button', { class: 'btn-primary', type: 'button' }, 'Import trip');
    importBtn.addEventListener('click', () => {
      const res = Store.addTrip(ta.value.trim());
      if (!res.ok) { ui.addError = res.errors.join(' '); render(); return; }
      ui.addPanel = false; ui.addError = ''; ui.editing = false;
      render();
    });
    const cancelBtn = el('button', { class: 'btn-ghost', type: 'button' }, 'Cancel');
    cancelBtn.addEventListener('click', () => { ui.addPanel = false; ui.addError = ''; render(); });
    actions.appendChild(importBtn); actions.appendChild(cancelBtn);
    panel.appendChild(actions);
    return panel;
  }

  // ---------- trip header ----------
  function renderTripHeader(trip) {
    if (ui.editing) {
      const wrap = el('div', { class: 'trip-header editing' });
      wrap.appendChild(el('div', { class: 'edit-section-title' }, 'Trip details'));
      const mk = (label, key, ph) => {
        const inp = el('input', { class: 'edit-input', value: trip[key] || '', placeholder: ph || '' });
        inp.addEventListener('change', () => { Store.updateTrip(trip.id, { [key]: inp.value }); });
        return el('label', { class: 'edit-field' }, [el('span', { class: 'edit-label' }, label), inp]);
      };
      wrap.appendChild(mk('Flag emoji', 'flag', '🧳'));
      wrap.appendChild(mk('Location title', 'destination', 'e.g. Japan'));
      wrap.appendChild(mk('Subtitle', 'subtitle', 'e.g. Kyoto · Osaka'));
      wrap.appendChild(mk('Date range', 'dateRange', 'e.g. June 24–30, 2026'));
      return wrap;
    }
    return el('div', { class: 'trip-header' }, [
      el('div', { class: 'trip-status-row' }, [
        el('span', { class: `pill trip-status status-${trip.status || 'upcoming'}` }, trip.status || 'upcoming'),
        trip.flag ? el('span', { class: 'trip-flag' }, trip.flag) : null,
        el('span', { class: 'trip-destination' }, trip.destination),
      ]),
      el('div', { class: 'trip-dates' }, [trip.dateRange, trip.subtitle].filter(Boolean).join(' · ')),
    ]);
  }

  function renderBanners(trip) {
    const m = trip.meta;
    if (!m) return [];
    const out = [];
    if (m.budgetYen) {
      out.push(el('div', { class: 'banner budget' },
        `Budget ~¥${Number(m.budgetYen).toLocaleString()} for ${m.travelers || 2}` +
        (m.budgetBufferYen ? ` (bring ¥${Number(m.budgetBufferYen).toLocaleString()} buffer)` : '') +
        (m.exchangeRate ? ` · ${m.exchangeRate}` : '')));
    }
    if (m.hotelKyoto || m.hotelOsaka || m.payment) {
      const bits = [];
      if (m.hotelKyoto) bits.push(`Kyoto ${m.hotelKyoto}`);
      if (m.hotelOsaka) bits.push(`Osaka ${m.hotelOsaka}`);
      out.push(el('div', { class: 'banner info' },
        (bits.length ? `Hotels: ${bits.join(' · ')}. ` : '') + (m.payment ? `Payment: ${m.payment}.` : '')));
    }
    return out;
  }

  function renderProgress(total) {
    const wrap = el('div', { class: 'progress-wrap' });
    const row = el('div', { class: 'progress-row' });
    const label = el('span', {}, ''); const pct = el('span', {}, '');
    row.appendChild(label); row.appendChild(pct);
    const bar = el('div', { class: 'progress-bar' });
    const fill = el('div', { class: 'progress-fill' });
    bar.appendChild(fill); wrap.appendChild(row); wrap.appendChild(bar);
    wrap._update = (done) => {
      const ratio = total ? done / total : 0;
      label.textContent = `${done} of ${total} items`;
      pct.textContent = `${Math.round(ratio * 100)}%`;
      fill.style.width = `${ratio * 100}%`;
    };
    return wrap;
  }

  // ---------- item: view + edit ----------
  const TAGS = ['transport', 'food', 'activity', 'shopping', 'tip'];

  function renderItemView(item, o) {
    const { checked, checkedKey, actuals, actualsKey, onCheckChange, onActualChange } = o;
    const isDone = checked.has(item.id);
    const cb = el('div', { class: 'checkbox', role: 'checkbox', 'aria-checked': isDone ? 'true' : 'false', tabindex: '0' });

    const foot = el('div', { class: 'item-foot' });
    if (item.price && item.price !== '—') foot.appendChild(el('span', { class: 'item-price' }, item.price));
    if (hasSpend(item.price)) {
      const input = el('input', {
        class: 'actual-input', type: 'text', inputmode: 'numeric',
        placeholder: 'actual', 'aria-label': `Actual amount for ${item.label}`,
        value: actuals[item.id] != null ? String(actuals[item.id]) : '',
      });
      const stop = (e) => e.stopPropagation();
      const box = el('label', { class: 'actual-box' }, [el('span', { class: 'actual-yen' }, '¥'), input]);
      box.addEventListener('click', stop);
      input.addEventListener('keydown', stop);
      input.addEventListener('input', () => {
        const v = input.value.replace(/[^\d]/g, '');
        if (v !== input.value) input.value = v;
        if (v === '') delete actuals[item.id]; else actuals[item.id] = Number(v);
        saveActuals(actualsKey, actuals);
        onActualChange();
      });
      foot.appendChild(box);
    }
    foot.appendChild(el('span', { class: `tag ${item.tag}` }, item.tag));

    const body = el('div', { class: 'item-body' }, [
      item.time ? el('div', { class: 'item-time' }, item.time) : null,
      el('div', { class: 'item-label' }, item.label),
      item.note ? el('div', { class: 'item-note' }, item.note) : null,
      foot,
    ]);
    const row = el('div', { class: `item${isDone ? ' done' : ''}` }, [cb, body]);
    const toggle = () => {
      if (checked.has(item.id)) checked.delete(item.id); else checked.add(item.id);
      saveSet(checkedKey, checked);
      row.classList.toggle('done');
      cb.setAttribute('aria-checked', checked.has(item.id) ? 'true' : 'false');
      onCheckChange();
    };
    cb.addEventListener('click', toggle);
    row.addEventListener('click', (e) => {
      if (e.target === cb || cb.contains(e.target) || (e.target.closest && e.target.closest('.actual-box'))) return;
      toggle();
    });
    cb.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    return row;
  }

  function renderItemEdit(trip, day, item) {
    const row = el('div', { class: 'item-edit' });
    const persist = () => Store.saveTrip(trip);
    const inp = (key, ph) => {
      const i = el('input', { class: 'edit-input', value: item[key] || '', placeholder: ph });
      i.addEventListener('change', () => { item[key] = i.value; persist(); });
      return i;
    };
    row.appendChild(inp('time', 'Time (e.g. ~9:00 AM)'));
    row.appendChild(inp('label', 'What to do'));
    row.appendChild(inp('note', 'Note (optional)'));
    row.appendChild(inp('price', 'Price (e.g. ¥440 for 2)'));

    const sel = el('select', { class: 'edit-input' });
    TAGS.forEach((t) => sel.appendChild(el('option', Object.assign({ value: t }, t === item.tag ? { selected: 'selected' } : {}), t)));
    sel.addEventListener('change', () => { item.tag = sel.value; persist(); });

    const del = el('button', { class: 'btn-del', type: 'button', title: 'Delete item' }, '✕');
    del.addEventListener('click', () => {
      day.items = day.items.filter((x) => x !== item);
      persist(); render();
    });
    row.appendChild(el('div', { class: 'item-edit-foot' }, [sel, del]));
    return row;
  }

  // ---------- day ----------
  function renderDay(day, ctx) {
    const { trip, checked, openDays, checkedKey, openKey, onAnyChange, actuals, actualsKey, updateTripBudget } = ctx;
    const open = ui.editing || openDays.has(day.id);
    const card = el('div', { class: `card${open ? ' open' : ''}`, dataset: { day: day.id } });

    const badge = el('span', { class: 'day-badge' }, '');
    const updateBadge = () => {
      if (day.isOkinawa) { badge.textContent = 'family'; badge.className = 'day-badge'; return; }
      const total = day.items.length;
      const done = day.items.filter((i) => checked.has(i.id)).length;
      const all = done === total && total > 0;
      badge.textContent = all ? '✓ done' : `${done}/${total}`;
      badge.className = 'day-badge' + (all ? ' done' : '');
    };
    updateBadge();

    const titles = el('div', { class: 'day-titles' }, [
      el('div', { class: 'day-name' }, day.name),
      el('div', { class: 'day-date' }, day.dateLabel),
    ]);
    let updateDayBudget = () => {};
    if (!day.isOkinawa) {
      const est = dayEst(day);
      const dayBudget = el('div', { class: 'day-budget' });
      updateDayBudget = () => {
        const act = day.items.reduce((s, i) => s + (Number(actuals[i.id]) || 0), 0);
        dayBudget.innerHTML = '';
        dayBudget.appendChild(el('span', { class: 'db-est' }, `Est ${yen(est)}`));
        dayBudget.appendChild(el('span', { class: 'db-act' + (act > est && est > 0 ? ' over' : '') }, `Actual ${yen(act)}`));
      };
      updateDayBudget();
      titles.appendChild(dayBudget);
    }
    const header = el('div', { class: 'day-header' }, [
      el('span', { class: 'day-emoji' }, day.emoji),
      titles,
      el('div', { class: 'day-meta' }, [badge, el('span', { class: 'chevron' }, '▼')]),
    ]);
    if (!ui.editing) {
      header.addEventListener('click', () => {
        card.classList.toggle('open');
        if (card.classList.contains('open')) openDays.add(day.id); else openDays.delete(day.id);
        saveSet(openKey, openDays);
      });
    }

    const body = el('div', { class: 'day-body' });

    if (ui.editing) {
      body.appendChild(renderDayEditFields(trip, day));
      if (day.isOkinawa) {
        (day.okinawaRows || []).forEach((r) => body.appendChild(renderOkinawaEditRow(trip, day, r)));
        const add = el('button', { class: 'btn-add', type: 'button' }, '＋ Add summary row');
        add.addEventListener('click', () => { (day.okinawaRows = day.okinawaRows || []).push({ time: '', text: '' }); Store.saveTrip(trip); render(); });
        body.appendChild(add);
      } else {
        day.items.forEach((it) => body.appendChild(renderItemEdit(trip, day, it)));
        const add = el('button', { class: 'btn-add', type: 'button' }, '＋ Add item');
        add.addEventListener('click', () => {
          day.items.push({ id: `${day.id}i${Date.now().toString(36)}`, time: '', label: 'New item', note: '', price: '—', tag: 'activity' });
          Store.saveTrip(trip); render();
        });
        body.appendChild(add);
      }
      card.appendChild(header); card.appendChild(body); return card;
    }

    if (day.weather) body.appendChild(el('span', { class: `weather-pill ${day.weatherClass || 'clear'}` }, day.weather));
    if (day.flightWarning) body.appendChild(el('div', { class: 'warn-box' }, [el('strong', { class: 'label' }, '⚠ Flight time check'), document.createTextNode(day.flightWarning)]));
    if (day.rainPlan) body.appendChild(el('div', { class: 'rain-plan' }, [el('strong', { class: 'label' }, '☂ Rain plan'), document.createTextNode(day.rainPlan)]));

    if (day.isOkinawa) {
      const ok = el('div', { class: 'okinawa-card' });
      (day.okinawaRows || []).forEach((r) => ok.appendChild(el('div', { class: 'okinawa-row' }, [el('div', { class: 'time' }, r.time), el('div', { class: 'text' }, r.text)])));
      body.appendChild(ok);
    } else {
      day.items.forEach((item) => body.appendChild(renderItemView(item, {
        checked, checkedKey, actuals, actualsKey,
        onCheckChange: () => { updateBadge(); onAnyChange(); },
        onActualChange: () => { updateDayBudget(); updateTripBudget(); },
      })));
    }
    card.appendChild(header); card.appendChild(body); return card;
  }

  function renderDayEditFields(trip, day) {
    const wrap = el('div', { class: 'day-edit' });
    const persist = () => Store.saveTrip(trip);
    const mk = (label, key, ph) => {
      const i = el('input', { class: 'edit-input', value: day[key] || '', placeholder: ph });
      i.addEventListener('change', () => { day[key] = i.value; persist(); });
      return el('label', { class: 'edit-field' }, [el('span', { class: 'edit-label' }, label), i]);
    };
    wrap.appendChild(mk('Emoji', 'emoji', '📅'));
    wrap.appendChild(mk('Day title', 'name', 'e.g. June 24 — Arrival'));
    wrap.appendChild(mk('Date label', 'dateLabel', 'e.g. Wednesday'));
    wrap.appendChild(mk('Weather', 'weather', 'e.g. 26°C · Clear'));
    const sel = el('select', { class: 'edit-input' });
    ['clear', 'mixed'].forEach((w) => sel.appendChild(el('option', Object.assign({ value: w }, w === (day.weatherClass || 'clear') ? { selected: 'selected' } : {}), w)));
    sel.addEventListener('change', () => { day.weatherClass = sel.value; persist(); });
    wrap.appendChild(el('label', { class: 'edit-field' }, [el('span', { class: 'edit-label' }, 'Weather color'), sel]));
    const rp = el('textarea', { class: 'edit-input', rows: '2', placeholder: 'Rain plan (optional)' }); rp.value = day.rainPlan || '';
    rp.addEventListener('change', () => { day.rainPlan = rp.value; persist(); });
    wrap.appendChild(el('label', { class: 'edit-field' }, [el('span', { class: 'edit-label' }, 'Rain plan'), rp]));

    const del = el('button', { class: 'btn-del-day', type: 'button' }, '🗑 Delete this day');
    del.addEventListener('click', () => { if (confirm(`Delete "${day.name}"?`)) { trip.days = trip.days.filter((d) => d !== day); persist(); render(); } });
    wrap.appendChild(del);
    return wrap;
  }

  function renderOkinawaEditRow(trip, day, r) {
    const row = el('div', { class: 'item-edit' });
    const persist = () => Store.saveTrip(trip);
    const t = el('input', { class: 'edit-input', value: r.time || '', placeholder: 'Time / date' });
    t.addEventListener('change', () => { r.time = t.value; persist(); });
    const x = el('input', { class: 'edit-input', value: r.text || '', placeholder: 'Description' });
    x.addEventListener('change', () => { r.text = x.value; persist(); });
    const del = el('button', { class: 'btn-del', type: 'button', title: 'Delete row' }, '✕');
    del.addEventListener('click', () => { day.okinawaRows = day.okinawaRows.filter((y) => y !== r); persist(); render(); });
    row.appendChild(t); row.appendChild(x); row.appendChild(el('div', { class: 'item-edit-foot' }, [del]));
    return row;
  }

  // ---------- focus trip ----------
  function renderTrip(trip) {
    const wrap = el('section', { class: 'trip-section', dataset: { trip: trip.id } });
    wrap.appendChild(renderTripHeader(trip));
    for (const b of renderBanners(trip)) wrap.appendChild(b);

    const checkedKey = tripKey(trip.id, 'checked');
    const openKey = tripKey(trip.id, 'open-days');
    const actualsKey = tripKey(trip.id, 'actuals');
    const checked = loadSet(checkedKey);
    const openDays = loadSet(openKey);
    const actuals = loadActuals(actualsKey);
    const total = Store.countCheckable(trip);

    const progress = renderProgress(total);
    progress._update(checked.size);
    if (!ui.editing) wrap.appendChild(progress);

    const tripBudget = el('div', { class: 'trip-budget' });
    const updateTripBudget = () => {
      let est = 0, act = 0;
      trip.days.forEach((d) => (d.items || []).forEach((i) => { est += parseYen(i.price); act += Number(actuals[i.id]) || 0; }));
      tripBudget.innerHTML = '';
      tripBudget.appendChild(el('span', { class: 'tb-est' }, `Estimated ${yen(est)}`));
      tripBudget.appendChild(el('span', { class: 'tb-act' + (act > est && est > 0 ? ' over' : '') }, `Actual ${yen(act)}`));
    };
    updateTripBudget();
    if (!ui.editing) wrap.appendChild(tripBudget);

    const onAnyChange = () => progress._update(checked.size);
    const ctx = { trip, checked, openDays, checkedKey, openKey, onAnyChange, actuals, actualsKey, updateTripBudget };
    for (const day of trip.days) wrap.appendChild(renderDay(day, ctx));

    if (ui.editing) {
      const addDay = el('button', { class: 'btn-add big', type: 'button' }, '＋ Add a day');
      addDay.addEventListener('click', () => {
        trip.days.push({ id: `d${Date.now().toString(36)}`, emoji: '📅', name: 'New day', dateLabel: '', weather: '', weatherClass: 'clear', rainPlan: '', items: [] });
        Store.saveTrip(trip); render();
      });
      wrap.appendChild(addDay);
      const doneEdit = el('button', { class: 'btn-primary wide', type: 'button' }, '✓ Done editing');
      doneEdit.addEventListener('click', () => { ui.editing = false; render(); });
      wrap.appendChild(doneEdit);
      return wrap;
    }

    // bottom actions (view mode)
    const actions = el('div', { class: 'trip-footer' });
    if (ui.donePanel) {
      actions.appendChild(renderDonePanel(trip));
    } else {
      const complete = el('button', { class: 'btn-complete', type: 'button' }, '✓ Mark trip complete');
      complete.addEventListener('click', () => { ui.donePanel = true; render(); });
      actions.appendChild(complete);
      const reset = el('button', { class: 'btn-reset', type: 'button' }, 'Reset all checks');
      reset.addEventListener('click', () => {
        if (!confirm(`Clear all checked items for ${trip.destination}?`)) return;
        checked.clear(); saveSet(checkedKey, checked); render();
      });
      actions.appendChild(reset);
    }
    wrap.appendChild(actions);
    return wrap;
  }

  function renderDonePanel(trip) {
    const panel = el('div', { class: 'panel done-panel' });
    panel.appendChild(el('div', { class: 'panel-title' }, 'Wrap up this trip'));
    panel.appendChild(el('div', { class: 'panel-hint' }, 'Add any notes — highlights, memories, what to remember — then move it to your trip history. You can reopen it later.'));
    const ta = el('textarea', { class: 'paste-area', rows: '4', placeholder: 'Trip notes (optional)…' });
    ta.value = trip.notes || '';
    panel.appendChild(ta);
    const actions = el('div', { class: 'panel-actions' });
    const save = el('button', { class: 'btn-primary', type: 'button' }, 'Save & move to history');
    save.addEventListener('click', () => {
      Store.completeTrip(trip.id, ta.value.trim());
      const next = Store.getTrips().find((t) => t.status !== 'past');
      if (next) Store.setCurrentId(next.id);
      ui.donePanel = false; render();
    });
    const cancel = el('button', { class: 'btn-ghost', type: 'button' }, 'Cancel');
    cancel.addEventListener('click', () => { ui.donePanel = false; render(); });
    actions.appendChild(save); actions.appendChild(cancel);
    panel.appendChild(actions);
    return panel;
  }

  // ---------- history ----------
  function renderHistory(pastTrips) {
    const wrap = el('section', { class: 'history-section' });
    wrap.appendChild(el('h2', { class: 'history-title' }, 'Trip history'));
    if (!pastTrips.length) {
      wrap.appendChild(el('div', { class: 'history-empty' }, 'Completed trips appear here — with your notes and checked items saved so you can look back.'));
      return wrap;
    }
    for (const t of pastTrips) {
      const total = Store.countCheckable(t);
      const done = loadSet(tripKey(t.id, 'checked')).size;
      const card = el('div', { class: 'history-card' }, [
        el('div', { class: 'history-row' }, [
          t.flag ? el('span', { class: 'trip-flag' }, t.flag) : null,
          el('div', { class: 'history-titles' }, [
            el('div', { class: 'history-dest' }, t.destination),
            el('div', { class: 'history-dates' }, [t.dateRange, t.subtitle].filter(Boolean).join(' · ')),
            t.completedAt ? el('div', { class: 'history-completed' }, `Completed ${fmtDate(t.completedAt)}`) : null,
          ]),
          el('span', { class: 'history-stats' }, `${done}/${total}`),
        ]),
      ]);
      if (t.notes) card.appendChild(el('div', { class: 'history-notes' }, t.notes));
      const acts = el('div', { class: 'history-actions' });
      const reopen = el('button', { class: 'mini-btn', type: 'button' }, '↩ Reopen');
      reopen.addEventListener('click', () => { Store.reopenTrip(t.id); ui.editing = false; ui.donePanel = false; render(); });
      const exp = el('button', { class: 'mini-btn', type: 'button' }, '⤓ Export');
      exp.addEventListener('click', () => { const d = Store.exportTrip(t.id); if (d) download(`${Store.slug(t.destination)}.json`, d); });
      const del = el('button', { class: 'mini-btn danger', type: 'button' }, '🗑 Delete');
      del.addEventListener('click', () => { if (confirm(`Delete "${t.destination}" from history? This cannot be undone.`)) { Store.removeTrip(t.id); render(); } });
      acts.appendChild(reopen); acts.appendChild(exp); acts.appendChild(del);
      card.appendChild(acts);
      wrap.appendChild(card);
    }
    return wrap;
  }

  // ---------- top-level render ----------
  function render() {
    root.innerHTML = '';
    root.appendChild(renderAppHeader());

    const trips = Store.getTrips();
    const currentId = Store.getCurrentId();
    const focus = trips.find((t) => t.id === currentId && t.status !== 'past')
      || trips.find((t) => t.status !== 'past') || null;
    const pastTrips = trips.filter((t) => t.status === 'past');

    if (ui.editing && !isOnline()) {
      root.appendChild(el('div', { class: 'offline-banner' }, '⚠ You went offline — edits are paused until you reconnect.'));
    }

    root.appendChild(renderToolbar(focus));
    if (ui.syncPanel) root.appendChild(renderSyncPanel());
    if (ui.addPanel) root.appendChild(renderAddPanel());

    if (focus) root.appendChild(renderTrip(focus));
    else root.appendChild(el('div', { class: 'empty' }, 'No active trip. Tap “＋ Add trip” to upload one.'));

    root.appendChild(renderHistory(pastTrips));
    root.appendChild(el('div', { class: 'offline-tag', id: 'syncStatus' }, syncFooterText()));
  }

  render();
  window.__renderApp = render;

  window.addEventListener('online', () => render());
  window.addEventListener('offline', () => render());
  window.addEventListener('mytrips:sync-status', () => {
    const n = document.getElementById('syncStatus');
    if (n) n.textContent = syncFooterText();
    if (ui.syncPanel) {
      const s = document.querySelector('.sync-status');
      const st = syncStatus();
      if (s) { s.textContent = SYNC_LABELS[st] || 'Saved on this device'; s.className = `sync-status sync-${st}`; }
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }
})();
