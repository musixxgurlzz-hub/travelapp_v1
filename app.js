(() => {
  const APP_NAME = 'My Trips';

  const tripKey = (tripId, kind) => `trip:${tripId}:${kind}`;
  const loadSet = (key) => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { return new Set(); }
  };
  const saveSet = (key, set) => localStorage.setItem(key, JSON.stringify([...set]));

  const root = document.getElementById('app');

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  };

  function countCheckable(trip) {
    return trip.days.filter(d => !d.isOkinawa).reduce((n, d) => n + d.items.length, 0);
  }

  function renderAppHeader() {
    return el('div', { class: 'app-header' }, [
      el('div', { class: 'app-brand' }, [
        el('img', { src: './icons/icon.svg', alt: '', class: 'app-logo' }),
        el('span', { class: 'app-title' }, APP_NAME),
      ]),
      el('div', { class: 'app-subtitle' }, 'Plan, pack, and check off — one trip at a time.'),
    ]);
  }

  function renderTripHeader(trip) {
    return el('div', { class: 'trip-header' }, [
      el('div', { class: 'trip-status-row' }, [
        el('span', { class: `pill trip-status status-${trip.status}` }, trip.status),
        trip.flag ? el('span', { class: 'trip-flag' }, trip.flag) : null,
        el('span', { class: 'trip-destination' }, trip.destination),
      ]),
      el('div', { class: 'trip-dates' }, `${trip.dateRange} · ${trip.subtitle}`),
    ]);
  }

  function renderBanners(trip) {
    const m = trip.meta;
    return [
      el('div', { class: 'banner budget' },
        `Budget ~¥${m.budgetYen.toLocaleString()} for ${m.travelers} (bring ¥${m.budgetBufferYen.toLocaleString()} buffer) · ${m.exchangeRate}`
      ),
      el('div', { class: 'banner info' },
        `Hotels: Kyoto ${m.hotelKyoto} · Osaka ${m.hotelOsaka}. Payment: ${m.payment}.`
      ),
    ];
  }

  function renderProgress(total) {
    const wrap = el('div', { class: 'progress-wrap' });
    const row = el('div', { class: 'progress-row' });
    const label = el('span', {}, '');
    const pct = el('span', {}, '');
    row.appendChild(label); row.appendChild(pct);
    const bar = el('div', { class: 'progress-bar' });
    const fill = el('div', { class: 'progress-fill' });
    bar.appendChild(fill);
    wrap.appendChild(row); wrap.appendChild(bar);
    wrap._update = (done) => {
      const ratio = total ? done / total : 0;
      label.textContent = `${done} of ${total} items`;
      pct.textContent = `${Math.round(ratio * 100)}%`;
      fill.style.width = `${ratio * 100}%`;
    };
    return wrap;
  }

  function renderItem(item, checked, storageKey, onChange) {
    const isDone = checked.has(item.id);
    const cb = el('div', { class: 'checkbox', role: 'checkbox', 'aria-checked': isDone ? 'true' : 'false', tabindex: '0' });
    const body = el('div', { class: 'item-body' }, [
      item.time ? el('div', { class: 'item-time' }, item.time) : null,
      el('div', { class: 'item-label' }, item.label),
      item.note ? el('div', { class: 'item-note' }, item.note) : null,
      el('div', { class: 'item-foot' }, [
        item.price && item.price !== '—' ? el('span', { class: 'item-price' }, item.price) : null,
        el('span', { class: `tag ${item.tag}` }, item.tag),
      ]),
    ]);
    const row = el('div', { class: `item${isDone ? ' done' : ''}` }, [cb, body]);
    const toggle = () => {
      if (checked.has(item.id)) checked.delete(item.id);
      else checked.add(item.id);
      saveSet(storageKey, checked);
      row.classList.toggle('done');
      cb.setAttribute('aria-checked', checked.has(item.id) ? 'true' : 'false');
      onChange();
    };
    cb.addEventListener('click', toggle);
    row.addEventListener('click', (e) => {
      if (e.target === cb || cb.contains(e.target)) return;
      toggle();
    });
    cb.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
    return row;
  }

  function renderDay(day, ctx) {
    const { checked, openDays, checkedKey, openKey, onAnyChange } = ctx;
    const card = el('div', { class: `card${openDays.has(day.id) ? ' open' : ''}`, dataset: { day: day.id } });

    const badge = el('span', { class: 'day-badge' }, '');
    const updateBadge = () => {
      if (day.isOkinawa) {
        badge.textContent = 'family';
        badge.className = 'day-badge';
        return;
      }
      const total = day.items.length;
      const done = day.items.filter(i => checked.has(i.id)).length;
      const isAllDone = done === total && total > 0;
      badge.textContent = isAllDone ? '✓ done' : `${done}/${total}`;
      badge.className = 'day-badge' + (isAllDone ? ' done' : '');
    };
    updateBadge();

    const header = el('div', { class: 'day-header' }, [
      el('span', { class: 'day-emoji' }, day.emoji),
      el('div', { class: 'day-titles' }, [
        el('div', { class: 'day-name' }, day.name),
        el('div', { class: 'day-date' }, day.dateLabel),
      ]),
      el('div', { class: 'day-meta' }, [badge, el('span', { class: 'chevron' }, '▼')]),
    ]);
    header.addEventListener('click', () => {
      card.classList.toggle('open');
      if (card.classList.contains('open')) openDays.add(day.id);
      else openDays.delete(day.id);
      saveSet(openKey, openDays);
    });

    const body = el('div', { class: 'day-body' });

    if (day.weather) {
      body.appendChild(el('span', { class: `weather-pill ${day.weatherClass || 'clear'}` }, day.weather));
    }
    if (day.flightWarning) {
      body.appendChild(el('div', { class: 'warn-box' }, [
        el('strong', { class: 'label' }, '⚠ Flight time check'),
        document.createTextNode(day.flightWarning),
      ]));
    }
    if (day.rainPlan) {
      body.appendChild(el('div', { class: 'rain-plan' }, [
        el('strong', { class: 'label' }, '☂ Rain plan'),
        document.createTextNode(day.rainPlan),
      ]));
    }

    if (day.isOkinawa) {
      const okCard = el('div', { class: 'okinawa-card' });
      for (const row of day.okinawaRows) {
        okCard.appendChild(el('div', { class: 'okinawa-row' }, [
          el('div', { class: 'time' }, row.time),
          el('div', { class: 'text' }, row.text),
        ]));
      }
      body.appendChild(okCard);
    } else {
      for (const item of day.items) {
        body.appendChild(renderItem(item, checked, checkedKey, () => { updateBadge(); onAnyChange(); }));
      }
    }

    card.appendChild(header);
    card.appendChild(body);
    return card;
  }

  function renderTrip(trip) {
    const wrap = el('section', { class: 'trip-section', dataset: { trip: trip.id } });
    wrap.appendChild(renderTripHeader(trip));
    for (const b of renderBanners(trip)) wrap.appendChild(b);

    const checkedKey = tripKey(trip.id, 'checked');
    const openKey = tripKey(trip.id, 'open-days');
    const checked = loadSet(checkedKey);
    const openDays = loadSet(openKey);
    const total = countCheckable(trip);

    const progress = renderProgress(total);
    progress._update(checked.size);
    wrap.appendChild(progress);

    const onAnyChange = () => progress._update(checked.size);
    const ctx = { checked, openDays, checkedKey, openKey, onAnyChange };

    for (const day of trip.days) wrap.appendChild(renderDay(day, ctx));

    const reset = el('button', { class: 'btn-reset', type: 'button' }, 'Reset all checks');
    reset.addEventListener('click', () => {
      if (!confirm(`Clear all checked items for ${trip.destination}?`)) return;
      checked.clear();
      saveSet(checkedKey, checked);
      render();
    });
    wrap.appendChild(el('div', { class: 'trip-footer' }, [reset]));
    return wrap;
  }

  function renderHistory(pastTrips) {
    const wrap = el('section', { class: 'history-section' });
    wrap.appendChild(el('h2', { class: 'history-title' }, 'Trip history'));
    if (!pastTrips.length) {
      wrap.appendChild(el('div', { class: 'history-empty' },
        'Past trips appear here once they end — your checked items stay saved so you can look back.'));
      return wrap;
    }
    for (const t of pastTrips) {
      const total = countCheckable(t);
      const done = loadSet(tripKey(t.id, 'checked')).size;
      wrap.appendChild(el('div', { class: 'history-card' }, [
        el('div', { class: 'history-row' }, [
          t.flag ? el('span', { class: 'trip-flag' }, t.flag) : null,
          el('div', { class: 'history-titles' }, [
            el('div', { class: 'history-dest' }, t.destination),
            el('div', { class: 'history-dates' }, `${t.dateRange} · ${t.subtitle}`),
          ]),
          el('span', { class: 'history-stats' }, `${done}/${total}`),
        ]),
      ]));
    }
    return wrap;
  }

  function render() {
    root.innerHTML = '';
    root.appendChild(renderAppHeader());

    const currentTrips = TRIPS.filter(t => t.status !== 'past');
    const pastTrips = TRIPS.filter(t => t.status === 'past');

    const focus = currentTrips.find(t => t.id === CURRENT_TRIP_ID) || currentTrips[0];
    if (focus) root.appendChild(renderTrip(focus));
    else root.appendChild(el('div', { class: 'empty' }, 'No active trip — add one to data.js.'));

    root.appendChild(renderHistory(pastTrips));
    root.appendChild(el('div', { class: 'offline-tag' }, 'Works offline · saves locally on this device'));
  }

  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
