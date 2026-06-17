const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection (Railway provides DATABASE_URL automatically)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create the outreach table on startup if it doesn't exist
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach (
        id SERIAL PRIMARY KEY,
        business TEXT NOT NULL,
        type TEXT,
        area TEXT,
        relationship TEXT,
        offer TEXT,
        price TEXT,
        platform TEXT,
        status TEXT DEFAULT 'sent',
        pitch TEXT,
        followup TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        business TEXT NOT NULL,
        type TEXT,
        area TEXT,
        contact TEXT,
        status TEXT DEFAULT 'lead',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Link outreach entries back to a client (added after clients exists).
    // ON DELETE SET NULL so deleting a client keeps its outreach history, just unlinked.
    await pool.query(`
      ALTER TABLE outreach
      ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL
    `);
    console.log('Database ready');
  } catch (err) {
    console.error('DB init error:', err);
  }
}
initDb();

app.use(cors({
  origin: ['https://curbsidesocial.co', 'https://www.curbsidesocial.co', 'http://localhost:3000']
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Curbside Social Co. API is running' });
});

// ---- Generate outreach message ----
app.post('/api/outreach', async (req, res) => {
  const { name, type, area, hook, platform, relationship, offer, price } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Business name and type are required' });
  }

  // Build relationship context for the AI
  let relationshipNote = '';
  switch (relationship) {
    case 'past_client':
      relationshipNote = 'This is a PAST CLIENT Rob has worked with before. Do NOT introduce himself or explain what he does. Do NOT pitch a cold price. Write warmly, like reconnecting. Reference working together again.';
      break;
    case 'active_client':
      relationshipNote = 'This is an ACTIVE CLIENT Rob is currently working with. Do NOT introduce himself, do NOT pitch a price as if new. Write like an ongoing working relationship, suggesting the next idea or shoot.';
      break;
    case 'contacted':
      relationshipNote = 'Rob has reached out before but no deal yet. This is a warm follow-up. Light reintroduction is fine but keep it brief and low-pressure.';
      break;
    default:
      relationshipNote = 'This is a NEW LEAD that has never been contacted. A brief, natural introduction is appropriate.';
  }

  // Build offer context
  let offerNote = '';
  if (!offer || offer === 'none') {
    offerNote = 'Do NOT mention a specific price or package. Just open a genuine conversation and gauge interest.';
  } else if (offer === 'free_intro') {
    offerNote = 'Offer ONE free intro reel as a no-risk sample, with a clear note that future work is paid. Frame it as showing what he can do, not desperation.';
  } else if (offer === 'trial_rate') {
    offerNote = `Offer a discounted first-timer trial rate${price ? ' of ' + price : ''} so they can see how he works, then standard pricing after. Position it as a low-risk way to start.`;
  } else if (offer === 'retainer') {
    offerNote = `Pitch an ongoing monthly content retainer${price ? ' at ' + price + '/month' : ''}. Focus on consistency and long-term value.`;
  } else if (offer === 'cinematic') {
    offerNote = `Pitch a single high-end cinematic brand film shot on the Sony FX3${price ? ' starting at ' + price : ''}. Emphasize premium quality for an upscale brand.`;
  } else if (offer === '3reels') {
    offerNote = `Offer 3 short-form reels${price ? ' for ' + price : ' for $150'}. One collab reel on Rob's page, the business keeps 2 to post. Good for a dish, product, or event.`;
  } else if (offer === 'custom') {
    offerNote = `Offer: ${price || 'custom package, discuss details'}. Work this in naturally.`;
  }

  const prompt = `You are writing outreach messages for Rob Galvan, a San Antonio video creator and photographer. He runs Curbside Social Co. and shoots on Sony FX3 and Sony A7IV.

RELATIONSHIP CONTEXT: ${relationshipNote}

OFFER CONTEXT: ${offerNote}

Platform: ${platform || 'Instagram DM'}
Business name: ${name}
Type: ${type}
${area ? 'Area: ' + area + ', San Antonio TX' : 'Location: San Antonio TX'}
${hook ? 'Hook or angle: ' + hook : ''}

Write two messages. Casual, like a real person texting. Short sentences. No em dashes. No hashtags. Sound local and genuine. Don't open with "Hey there" or anything generic. Adapt fully to the relationship context above.

1. FIRST MESSAGE: Under 75 words. Mention the business by name where natural.
2. FOLLOW-UP: 2 sentences max. Super low-key. No pressure. Under 40 words.

Respond ONLY with valid JSON, no markdown, no backticks:
{"pitch":"...","followup":"..."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(i => i.text || '').join('').trim();
    const clean = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);
  } catch (err) {
    console.error('Outreach error:', err);
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

// ---- Save an outreach log entry ----
app.post('/api/log', async (req, res) => {
  const { business, type, area, relationship, offer, price, platform, pitch, followup, status, client_id } = req.body;
  if (!business) return res.status(400).json({ error: 'Business is required' });

  try {
    const result = await pool.query(
      `INSERT INTO outreach (business, type, area, relationship, offer, price, platform, pitch, followup, status, client_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [business, type, area, relationship, offer, price, platform, pitch, followup, status || 'sent', client_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Log save error:', err);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// ---- Get all outreach log entries ----
app.get('/api/log', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT outreach.*, clients.business AS client_name
       FROM outreach
       LEFT JOIN clients ON outreach.client_id = clients.id
       ORDER BY outreach.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Log fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// ---- Update an entry's status ----
app.patch('/api/log/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE outreach SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ---- Delete an entry ----
app.delete('/api/log/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM outreach WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ---- Create a client ----
app.post('/api/clients', async (req, res) => {
  const { business, type, area, contact, status, notes } = req.body;
  if (!business) return res.status(400).json({ error: 'Business name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO clients (business, type, area, contact, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [business, type, area, contact, status || 'lead', notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Client create error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// ---- Get all clients ----
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY business ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Client fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// ---- Update a client ----
app.patch('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { business, type, area, contact, status, notes } = req.body;
  if (!business) return res.status(400).json({ error: 'Business name is required' });

  try {
    const result = await pool.query(
      `UPDATE clients SET business = $1, type = $2, area = $3, contact = $4, status = $5, notes = $6
       WHERE id = $7 RETURNING *`,
      [business, type, area, contact, status || 'lead', notes, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Client update error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// ---- Delete a client ----
app.delete('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Client delete error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// ---- Website audit (free, runs server-side) ----
// Fetches a business's site and reports wins + easy fixes. Framing is always
// positive: green looks-good for passes, amber easy-win for misses, each with a
// short "what I'd do about it" line that points back at something Rob sells.

// Strip scripts/styles/tags so we can scan visible text (e.g. for a phone number)
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function check(key, pass, label, fix) {
  return { key, label, pass, fix: pass ? '' : fix };
}

// The 9 presence checks. Returns the findings array.
function runSiteChecks(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  // 1. mobile viewport
  const hasViewport = metaTags.some(t => /name=["']?viewport["']?/i.test(t));

  // 2. non-empty title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const hasTitle = !!(titleMatch && titleMatch[1].trim().length);

  // 3. meta description with real content
  const descTag = metaTags.find(t => /name=["']?description["']?/i.test(t));
  const hasDescription = !!(descTag && /content=["'][^"']+["']/i.test(descTag));

  // 4. at least one H1
  const hasH1 = /<h1[\s>]/i.test(html);

  // 5. favicon (any rel containing "icon")
  const hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);

  // 6. Open Graph image with real content
  const ogTag = metaTags.find(t => /property=["']?og:image["']?/i.test(t));
  const hasOgImage = !!(ogTag && /content=["'][^"']+["']/i.test(ogTag));

  // 7. visible phone: a tel: link or a phone-shaped string in the text
  const hasTel = /href=["']tel:/i.test(html);
  const hasPhonePattern = /(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/.test(stripTags(html));
  const hasPhone = hasTel || hasPhonePattern;

  // 8. social media link
  const hasSocial = /(instagram\.com|facebook\.com|fb\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com)/i.test(html);

  // 9. image alt text: if images exist, most should carry an alt attribute
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  let altOk;
  if (imgTags.length === 0) {
    altOk = true; // nothing to fix
  } else {
    const withAlt = imgTags.filter(t => /\salt\s*=\s*["']/i.test(t)).length;
    altOk = withAlt / imgTags.length >= 0.7;
  }

  return [
    check('viewport', hasViewport, 'Mobile-friendly viewport',
      'Looks like it is not set up for phones. Most of your customers find you on mobile, so I would tighten the mobile layout as part of a site refresh.'),
    check('title', hasTitle, 'Page title',
      'The browser tab has no real title. I would set it to your name so it does not read as Untitled.'),
    check('description', hasDescription, 'Search description',
      'No summary under your name in Google search. I would write the little blurb so it sounds like you, not a guess.'),
    check('h1', hasH1, 'Clear headline',
      'No clear headline up top. I would add one so people and Google instantly get what you do.'),
    check('favicon', hasFavicon, 'Favicon (tab icon)',
      'Tiny one. I would add the little tab icon so the site looks finished.'),
    check('ogImage', hasOgImage, 'Link-preview image',
      'When someone shares your link it shows a blank box. I would drop in a clean preview frame, the kind I pull from a reel shoot.'),
    check('phone', hasPhone, 'Visible phone number',
      'No tap-to-call number I can find. I would add one up top so a hungry customer can call or book in one tap.'),
    check('social', hasSocial, 'Social media links',
      'Your social links are not on the site. I would add them so visitors follow you, then keep that page fed with a reels package.'),
    check('alt', altOk, 'Image alt text',
      'Some photos have no description. Small fix. I would add alt text so Google and screen readers can read your images.')
  ];
}

function buildOpportunity(score) {
  if (score >= 7) {
    return "Site's in good shape. The gap is fresh content. I'd pitch a 3 reels package or a monthly retainer to keep it active.";
  }
  if (score <= 4) {
    return "I'd lead with a site refresh (a landing or brochure site), then keep it fed with reels.";
  }
  return "A few easy wins on the site, plus fresh content. I'd pair a light site refresh with a 3 reels package.";
}

app.post('/api/audit', async (req, res) => {
  let { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A website URL is required.' });
  }

  url = url.trim();
  // Normalize: add https:// if the user left off the protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  // Only allow http/https
  let parsed;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch (e) {
    return res.status(400).json({ error: 'That does not look like a valid website URL.' });
  }

  // Fetch with a timeout and a normal browser user-agent so sites don't block us
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let html;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
      }
    });
    clearTimeout(timer);

    if (!response.ok) {
      return res.status(502).json({ error: 'Could not load that site. Double-check the URL.' });
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(502).json({ error: 'That link did not return a normal web page. Double-check the URL.' });
    }
    html = await response.text();
  } catch (err) {
    clearTimeout(timer);
    console.error('Audit fetch error:', err.message);
    return res.status(502).json({ error: 'Could not load that site. Double-check the URL.' });
  }

  try {
    const findings = runSiteChecks(html);
    const score = findings.filter(f => f.pass).length;
    const total = findings.length;
    const wins = total - score;
    res.json({ url: parsed.href, score, total, wins, opportunity: buildOpportunity(score), findings });
  } catch (err) {
    console.error('Audit parse error:', err);
    res.status(500).json({ error: 'Failed to run the audit.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
