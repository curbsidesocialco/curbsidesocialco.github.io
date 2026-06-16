const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://curbsidesocial.co', 'https://www.curbsidesocial.co', 'http://localhost:3000']
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Curbside Social Co. API is running' });
});

// Generate outreach message
app.post('/api/outreach', async (req, res) => {
  const { name, type, area, hook, platform } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Business name and type are required' });
  }

  const context = [
    'Business name: ' + name,
    'Type: ' + type,
    area ? 'Area: ' + area + ', San Antonio TX' : 'Location: San Antonio TX',
    hook ? 'Hook: ' + hook : ''
  ].filter(Boolean).join('\n');

  const prompt = `You are writing outreach messages for Rob Galvan, a San Antonio video creator and photographer. He runs Curbside Social Co. and shoots on Sony FX3 and Sony A7IV.

His offer: $150 for 3 short-form video reels. One collab reel goes on his page highlighting the business, the business keeps 2 reels to post themselves. Good for a dish, product, or upcoming event.

Platform: ${platform || 'Instagram DM'}

Business info:
${context}

Write two messages. Casual, like a real person texting. Short sentences. No em dashes. No hashtags. Sound local and genuine. Don't open with "Hey there" or anything generic.

1. FIRST MESSAGE: Under 75 words. Mention the business by name. Sneak the offer in naturally, not as the opener.
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
