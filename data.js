// All trips, current and past. Add new entries to TRIPS; switch which one
// the app shows by changing CURRENT_TRIP_ID. Past trips render in the
// History section with their checklist state intact.
const TRIPS = [{
  id: 'japan-2026',
  destination: 'Japan',
  subtitle: 'Kyoto · Osaka · Okinawa · Kobe',
  dateRange: 'June 24–30, 2026',
  status: 'upcoming',
  flag: '🇯🇵',
  meta: {
    title: 'Japan Trip · June 24–30, 2026',
    travelers: 2,
    budgetYen: 98000,
    budgetBufferYen: 120000,
    exchangeRate: '¥1 ≈ Rp 111',
    hotelKyoto: 'Shijo area hotel',
    hotelOsaka: 'The OneFive Osaka Namba-Kuromon (opposite Kuromon Market)',
    payment: 'ICOCA for transit; cash for shrines/small restaurants; cards at big retail'
  },
  days: [
    {
      id: 'd1',
      emoji: '✈️',
      name: 'June 24 — Arrival',
      dateLabel: 'Wednesday',
      weather: '26°C · Clear morning, drizzle possible evening',
      weatherClass: 'mixed',
      rainPlan: 'If raining — Pontocho Alley is covered (dinner unaffected); Gion stroll fine with a poncho from Daiso; use Nishiki Market arcade instead of the riverbank walk.',
      items: [
        { id: 'd1i1', time: 'At KIX arrivals hall', label: 'Quick bite at Family Mart or Lawson', note: '2F south end Family Mart / 1F Lawson; onigiri + drink; save appetite for dinner', price: '~¥400–600 for 2', tag: 'food' },
        { id: 'd1i2', time: 'At KIX JR counter', label: 'Get ICOCA card x2 + load ¥10,000 each', note: 'Load as needed', price: '—', tag: 'transport' },
        { id: 'd1i3', time: 'At KIX JR counter', label: 'Buy Haruka foreigner tickets x2 (arrival + June 26)', note: 'Show passport, buy both now', price: '¥4,400 for 2', tag: 'transport' },
        { id: 'd1i4', time: '~2:30 PM', label: 'Haruka Express to Kyoto Station', note: '~75 min, direct', price: 'Included above', tag: 'transport' },
        { id: 'd1i5', time: '~4:15 PM', label: 'Subway Karasuma Line to Shijo', note: '2 stops, tap ICOCA', price: '¥440 for 2', tag: 'transport' },
        { id: 'd1i6', time: '~4:30 PM', label: 'Check in to Shijo hotel', note: 'Drop bags, freshen up', price: '—', tag: 'activity' },
        { id: 'd1i7', time: '~5:30 PM', label: 'Daiso, Shinkyogoku Diamond Building', note: 'Rain ponchos, umbrella, travel essentials, 5 min walk', price: '~¥500–1,000 for 2', tag: 'shopping' },
        { id: 'd1i8', time: '~6:00 PM', label: 'Early dinner at Pontocho Alley', note: 'Restaurants open 5:30–6 PM, quiet before rush', price: '¥1,600–3,000 for 2', tag: 'food' },
        { id: 'd1i9', time: '~7:30 PM', label: 'Nishiki Tenmangu Shrine omikuji', note: 'Mechanical English fortune, 2 min from hotel', price: '¥400 for 2', tag: 'activity' },
        { id: 'd1i10', time: '~8:00 PM', label: 'Gion & Hanamikoji Street stroll', note: 'Most atmospheric after dinner', price: 'Free', tag: 'activity' },
        { id: 'd1i11', time: 'After', label: 'Kamo Riverbank walk', note: 'Or Nishiki arcade if wet', price: 'Free', tag: 'activity' }
      ]
    },
    {
      id: 'd2',
      emoji: '🌿',
      name: 'June 25 — Big Day Kyoto',
      dateLabel: 'Thursday · wake 5:00 AM',
      weather: '26°C · Mixed weather',
      weatherClass: 'mixed',
      rainPlan: '5:30–11 AM is the safest outdoor window (all key activities here). Sagano Train is open-air — light rain is fine, wear poncho for heavy rain. 2 PM hotel rest is perfectly timed to wait out rain. TOWERLAND rooftop has covered sofa areas. Evening shopping is all indoors.',
      items: [
        { id: 'd2i1', time: '5:00 AM', label: 'Wake up', note: 'SET TWO ALARMS TONIGHT', price: '—', tag: 'tip' },
        { id: 'd2i2', time: '5:30 AM', label: 'Subway Shijo→Kyoto Station, then JR→Inari Station', note: 'Subway ¥220pp, JR Nara Line 2 stops, first trains ~5:30 AM', price: '¥740 for 2', tag: 'transport' },
        { id: 'd2i3', time: '5:45–7:15 AM', label: 'Fushimi Inari golden hour', note: 'Senbon Torii tunnels, completely empty, no climbing needed', price: 'Free', tag: 'activity' },
        { id: 'd2i4', time: '~7:00 AM', label: 'Araki Shrine fox omikuji (next to Inari)', note: 'Fox-shaped English omikuji, rare souvenir', price: '¥1,000 for 2', tag: 'activity' },
        { id: 'd2i5', time: '~7:15 AM', label: 'Street food stalls near Inari entrance', note: 'Inari sushi or taiyaki', price: '~¥400–600 for 2', tag: 'food' },
        { id: 'd2i6', time: '~7:30 AM', label: 'JR to Kyoto Station, then straight to Arashiyama', note: 'JR Nara Line, subway to Shijo-Omiya, Randen Tram to Arashiyama — no hotel stop', price: '¥980 for 2', tag: 'transport' },
        { id: 'd2i7', time: '~8:30 AM', label: 'Arrive Arashiyama, quick breakfast riverside cafe', note: 'Cafes open 8 AM near Togetsukyo Bridge', price: '~¥600–1,000 for 2', tag: 'food' },
        { id: 'd2i8', time: '~9:00 AM', label: 'Bamboo Forest', note: 'Still quiet at this hour', price: 'Free', tag: 'activity' },
        { id: 'd2i9', time: '~9:30 AM', label: 'Tenryu-ji Temple gardens', note: 'Opens 8:30 AM, zen garden + pond', price: '¥1,000 for 2', tag: 'activity' },
        { id: 'd2i10', time: '~9:45 AM', label: 'Omikuji at Tenryu-ji', note: 'Keep good luck in wallet, tie bad luck to ropes', price: '¥400 for 2', tag: 'activity' },
        { id: 'd2i11', time: '~10:15 AM', label: 'Street food along Togetsukyo Bridge', note: 'Matcha soft serve, mitarashi dango, roasted chestnuts', price: '~¥400–600 for 2', tag: 'food' },
        { id: 'd2i12', time: '~10:30 AM', label: 'Deer near Togetsukyo Bridge, north riverbank', note: 'Roam freely, buy crackers nearby', price: '~¥200–400 for 2', tag: 'activity' },
        { id: 'd2i13', time: '~11:15 AM', label: 'Walk to Torokko Arashiyama Station', note: '~5 min', price: '—', tag: 'transport' },
        { id: 'd2i14', time: '11:45 AM', label: 'Sagano Romantic Train to Kameoka', note: '25 min gorge scenery; BOOK IN ADVANCE on Klook', price: '¥1,760 for 2', tag: 'transport' },
        { id: 'd2i15', time: '~12:15 PM', label: 'Arrive Kameoka, short walk + lunch', note: 'Gateway town; riverside walk; 30–45 min', price: '¥1,600–3,000 for 2', tag: 'food' },
        { id: 'd2i16', time: '~1:00 PM', label: 'JR Sagano back to Kyoto Station', note: '~30 min, rain starting around now', price: '¥480 for 2', tag: 'transport' },
        { id: 'd2i17', time: '~2:00 PM', label: 'Back at hotel — REST', note: 'Wait out afternoon rain, freshen up before rooftop dinner', price: '—', tag: 'tip' },
        { id: 'd2i18', time: '4:00–7:00 PM', label: 'Vintage bag shopping, Shijo area', note: '2nd Street, Brand Off, Kindal Kyoto Shijo, Ragtag — within 10 min walk; passport for tax-free over ¥5,000', price: 'Budget ~¥5,000 for 1 bag', tag: 'shopping' },
        { id: 'd2i19', time: '5:00–7:00 PM', label: 'Mina Kyoto Mall — GU + Uniqlo + Loft', note: '10 min walk on Kawaramachi, same area as vintage shops', price: 'Budget as needed', tag: 'shopping' },
        { id: 'd2i20', time: '~7:30 PM', label: 'TOWERLAND Rooftop Bar dinner', note: 'Kyoto Tower Building 10F, right at Kyoto Station; BBQ sets with chicken + seafood, no beef needed; covered sofa areas if raining; book ahead', price: '~¥4,000pp = ¥8,000 for 2', tag: 'food' }
      ]
    },
    {
      id: 'd3',
      emoji: '🏮',
      name: 'June 26 — Osaka Stop + Fly',
      dateLabel: 'Friday · Flight 3:25 PM',
      weather: '26°C · Mixed weather',
      weatherClass: 'mixed',
      rainPlan: 'All transport runs regardless of rain. Grand Front Osaka is fully indoors. KIX airport is fully indoors. Rain on the train window Kyoto→Osaka is actually scenic.',
      items: [
        { id: 'd3i1', time: '9:00 AM', label: 'Check out of Kyoto hotel', note: 'Pack only 7kg each for Okinawa, leave rest in Ecbo storage', price: '—', tag: 'tip' },
        { id: 'd3i2', time: '9:15 AM', label: 'JR Special Rapid to Osaka Station', note: '~30 min, tap ICOCA', price: '¥1,160 for 2', tag: 'transport' },
        { id: 'd3i3', time: '~9:45 AM', label: 'Drop backpack at Ecbo Cloak (pre-booked)', note: 'Drop near Osaka Station/Umeda; show QR code; short subway ride from Namba to collect June 29', price: '~¥1,600 for 4 days', tag: 'tip' },
        { id: 'd3i4', time: '9:45–11:30 AM', label: 'Lunch + explore Umeda', note: 'Grand Front Osaka food hall, Takimi-koji alley in Umeda Sky Building, fully indoors', price: '¥1,600–3,000 for 2', tag: 'food' },
        { id: 'd3i5', time: '11:30 AM', label: 'Haruka Express to KIX', note: '~50 min; buy at Osaka Station JR counter, show passport', price: '¥4,400 for 2', tag: 'transport' },
        { id: 'd3i6', time: '~12:20 PM', label: 'Arrive KIX, check in, browse duty free', note: '3+ hours before flight; try 551 Horai pork buns in departures', price: '—', tag: 'food' },
        { id: 'd3i7', time: '3:25 PM', label: '✈️ Depart KIX → Naha, Okinawa', note: '', price: 'Flight paid', tag: 'transport' },
        { id: 'd3i8', time: '4:40 PM', label: '🌺 Land Naha — family picks up!', note: '', price: '—', tag: 'activity' }
      ]
    },
    {
      id: 'd4',
      emoji: '🌺',
      name: 'June 26–29 — Okinawa',
      dateLabel: 'Family-hosted',
      weather: '',
      weatherClass: 'clear',
      isOkinawa: true,
      okinawaRows: [
        { time: 'June 26 · 4:40 PM', text: 'Land Naha Airport, family picks up!' },
        { time: 'June 27 (Sat)', text: 'Free day with family' },
        { time: 'June 28 (Sun)', text: 'Free day — beach, Kokusai Dori, local food' },
        { time: 'June 29 · 11:10 AM', text: '✈️ Depart Naha → Kobe Airport' }
      ]
    },
    {
      id: 'd5',
      emoji: '🏙️',
      name: 'June 29 — Kobe + Osaka Namba',
      dateLabel: 'Monday',
      weather: '27°C · Mixed weather',
      weatherClass: 'mixed',
      rainPlan: 'Nankinmachi food stalls are covered. Kitano Ijinkan fine in light rain. Dotonbori, Kuromon Market and Shinsaibashi are all rain-proof and walkable from the hotel.',
      flightWarning: 'Scoot ticket shows depart 11:10 AM / land 11:15 AM — impossible for a ~2hr flight. Actual arrival likely ~1:15 PM. CONFIRM on ticket before travel day.',
      items: [
        { id: 'd5i1', time: '11:10 AM', label: '✈️ Depart Naha → Kobe Airport (UKB)', note: 'Confirm actual arrival time on Scoot ticket; ticket shows 11:15 AM landing which is impossible', price: 'Paid', tag: 'transport' },
        { id: 'd5i2', time: '~1:15 PM', label: 'Land Kobe Airport, collect bags', note: '', price: '—', tag: 'transport' },
        { id: 'd5i3', time: '~1:20 PM', label: 'Port Liner to Sannomiya', note: '~18 min, tap ICOCA', price: '¥680 for 2', tag: 'transport' },
        { id: 'd5i4', time: '~1:40 PM', label: 'Nankinmachi (Kobe Chinatown) lunch', note: '5 min walk from Motomachi Station; pork buns (butaman) from Roushouki; pan-fried dumplings from YUN YUN; bifun rice noodles; no beef needed', price: '~¥2,000–3,000 for 2', tag: 'food' },
        { id: 'd5i5', time: '~2:30 PM', label: 'Kitano Ijinkan — historic Western houses', note: '~15 min walk from Sannomiya, 19th-century European-style houses, harbour views, free to walk', price: 'Free', tag: 'activity' },
        { id: 'd5i6', time: '~3:15 PM', label: 'Hanshin Line Sannomiya to Osaka Umeda', note: '~44 min, tap ICOCA — gets you near Ecbo Cloak pickup point', price: '¥840 for 2', tag: 'transport' },
        { id: 'd5i7', time: '~4:00 PM', label: 'Collect Ecbo Cloak backpack near Osaka Station', note: 'Walk to pre-booked spot, show QR code', price: 'Already paid', tag: 'tip' },
        { id: 'd5i8', time: '~4:20 PM', label: 'Subway Midosuji to Namba', note: '~15 min, Umeda→Namba, tap ICOCA', price: '¥480 for 2', tag: 'transport' },
        { id: 'd5i9', time: '~4:40 PM', label: 'Check in — The OneFive Osaka Namba-Kuromon', note: 'Directly opposite Kuromon Market! Drop bags, freshen up', price: '—', tag: 'activity' },
        { id: 'd5i10', time: '~5:00 PM', label: 'Kuromon Ichiba Market, right across from the hotel', note: 'Fresh seafood, fruits, takoyaki, local delicacies, 2 min walk', price: 'Browse + snack ~¥1,000–2,000 for 2', tag: 'food' },
        { id: 'd5i11', time: '~6:00 PM', label: 'Walk to Dotonbori (4 min from hotel)', note: 'Neon lights, giant crab sign, Glico running man photo', price: 'Free', tag: 'activity' },
        { id: 'd5i12', time: 'Note', label: 'Onitsuka Tiger moved to June 30 morning instead', note: 'Store closes 7:30 PM / last entry 7:00 PM, too tight on a travel day, doing it fresh at opening tomorrow', price: '—', tag: 'tip' },
        { id: 'd5i13', time: '~7:30 PM', label: 'Shinsaibashi + Amerikamura — GU + MUJI', note: 'Covered arcade, 10 min walk from hotel, rain-proof', price: 'Budget as needed', tag: 'shopping' },
        { id: 'd5i14', time: '~8:30 PM', label: 'Dinner, Dotonbori area', note: 'Takoyaki, kushikatsu, okonomiyaki', price: '¥1,600–3,000 for 2', tag: 'food' },
        { id: 'd5i15', time: '~9:30 PM', label: 'Night walk, Dotonbori canal', note: 'Most atmospheric at night, short walk back to hotel', price: 'Free', tag: 'activity' }
      ]
    },
    {
      id: 'd6',
      emoji: '😎',
      name: 'June 30 — Onitsuka Tiger + Fly Home',
      dateLabel: 'Tuesday · Flight 3:50 PM',
      weather: '27°C · Clear weather',
      weatherClass: 'clear',
      rainPlan: 'Onitsuka Tiger is indoors. Nankai Express runs in all weather. Refund ICOCA before security. Last Lawson run for snacks in departures.',
      items: [
        { id: 'd6i1', time: '~9:00 AM', label: 'Wake up, breakfast, pack', note: 'Relaxed start, no early alarm, consolidate Kyoto shopping into checked luggage', price: '—', tag: 'tip' },
        { id: 'd6i2', time: '~10:45 AM', label: 'Check out, walk to Onitsuka Tiger Shinsaibashi', note: 'Preview Bldg B1F, 2-10-24 Nishi-Shinsaibashi, ~10–12 min walk from hotel', price: '—', tag: 'transport' },
        { id: 'd6i3', time: '11:00 AM', label: 'Onitsuka Tiger, right at opening', note: 'Best time, no crowds, bring passport for tax-free, best selection in Japan', price: '¥10,000–15,000 per pair', tag: 'shopping' },
        { id: 'd6i4', time: '~12:00 PM', label: 'Quick lunch nearby, Shinsaibashi/Dotonbori area', note: '', price: '¥1,600–3,000 for 2', tag: 'food' },
        { id: 'd6i5', time: '~1:00 PM', label: 'Walk to Namba Station', note: '~7–10 min from Shinsaibashi area', price: '—', tag: 'transport' },
        { id: 'd6i6', time: '~1:15 PM', label: 'Nankai Airport Express to KIX', note: '~43 min, direct from Namba, tap ICOCA', price: '~¥3,880 for 2', tag: 'transport' },
        { id: 'd6i7', time: '~2:00 PM', label: 'Arrive KIX', note: '~1h50 buffer before flight', price: '—', tag: 'transport' },
        { id: 'd6i8', time: 'At airport', label: 'Refund ICOCA balance x2', note: 'Any JR ticket machine, get yen back minus ¥500 deposit each', price: 'Get refund', tag: 'tip' },
        { id: 'd6i9', time: 'At airport', label: 'Last Lawson konbini run in departures', note: 'Japanese KitKats, face masks, snacks', price: '~¥500–1,000 for 2', tag: 'food' },
        { id: 'd6i10', time: 'Departures', label: 'Duty free last browse', note: 'Alcohol, cosmetics, matcha chocolates', price: 'Budget as needed', tag: 'shopping' },
        { id: 'd6i11', time: '3:50 PM', label: '✈️ Depart KIX → Home', note: '', price: 'Flight paid', tag: 'transport' }
      ]
    }
  ]
}];

const CURRENT_TRIP_ID = 'japan-2026';
