// Shared-state sync endpoint backed by Upstash Redis (provisioned via the
// Vercel Marketplace). Stores one JSON document per "space" (an unguessable id
// shared between the paired devices). Optimistic concurrency via a version
// number: PUT with the version you last saw; if the server moved on, you get
// 409 + the current document so the client can converge.
//
// Zero npm dependencies — talks to the Upstash REST API with global fetch.

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const keyFor = (space) => `mytrips:state:${space}`;
const validSpace = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(s);

async function redis(cmd) {
  const r = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body != null) {
      if (typeof req.body === 'string') { try { resolve(JSON.parse(req.body)); } catch { resolve(null); } }
      else resolve(req.body);
      return;
    }
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || 'null')); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!REST_URL || !REST_TOKEN) { res.status(503).json({ error: 'sync storage not configured' }); return; }

    const space = req.query && req.query.space;
    if (!validSpace(space)) { res.status(400).json({ error: 'invalid space id' }); return; }
    const key = keyFor(space);

    if (req.method === 'GET') {
      const raw = await redis(['GET', key]);
      res.status(200).json(raw ? JSON.parse(raw) : { state: null, version: 0 });
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readBody(req);
      const baseVersion = body && typeof body.baseVersion === 'number' ? body.baseVersion : null;
      const raw = await redis(['GET', key]);
      const current = raw ? JSON.parse(raw) : { version: 0 };
      if (baseVersion != null && current.version !== baseVersion) {
        res.status(409).json(current); // caller is behind — return latest to converge
        return;
      }
      const doc = { state: body ? body.state : null, version: (current.version || 0) + 1, updatedAt: Date.now() };
      await redis(['SET', key, JSON.stringify(doc)]);
      res.status(200).json({ version: doc.version, updatedAt: doc.updatedAt });
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
