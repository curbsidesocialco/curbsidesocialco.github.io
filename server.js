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
  const { business, type, area, relationship, offer, price, platform, pitch, followup, status } = req.body;
  if (!business) return res.status(400).json({ error: 'Business is required' });

  try {
    const result = await pool.query(
      `INSERT INTO outreach (business, type, area, relationship, offer, price, platform, pitch, followup, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [business, type, area, relationship, offer, price, platform, pitch, followup, status || 'sent']
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
    const result = await pool.query('SELECT * FROM outreach ORDER BY created_at DESC');
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
