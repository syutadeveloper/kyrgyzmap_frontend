const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

const readBody = async (req) => {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') {
    return new URLSearchParams(req.body).toString();
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const upstream = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'kyrgyzmap/1.0 (+https://vercel.com)',
      },
      body,
    });

    const text = await upstream.text();
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
    );
    res.status(upstream.status).send(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Overpass proxy failed';
    res.status(502).json({ error: message });
  }
}
