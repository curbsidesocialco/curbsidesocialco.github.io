// Outreach message generator — Anthropic API direct integration

let activePlatform = 'Instagram DM';

function setPlatform(platform, btnId) {
  activePlatform = platform;
  ['btn-ig', 'btn-fb', 'btn-email'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(btnId).classList.add('active');
}

async function generatePitch() {
  const name  = document.getElementById('biz-name').value.trim();
  const type  = document.getElementById('biz-type').value;
  const area  = document.getElementById('biz-area').value.trim();
  const hook  = document.getElementById('biz-hook').value.trim();
  const errEl = document.getElementById('outreach-error');

  errEl.style.display = 'none';

  if (!name || !type) {
    errEl.textContent = 'Please enter a business name and select a type.';
    errEl.style.display = 'block';
    return;
  }

  const apiKey = localStorage.getItem('css_api_key');
  if (!apiKey) {
    errEl.textContent = 'No API key found. Go to the Settings tab and paste your Anthropic API key.';
    errEl.style.display = 'block';
    return;
  }

  const pitchEl    = document.getElementById('pitch-text');
  const followupEl = document.getElementById('followup-text');
  const genBtn     = document.getElementById('gen-btn');

  pitchEl.classList.add('msg-placeholder');
  pitchEl.textContent = 'Generating...';
  followupEl.classList.add('msg-placeholder');
  followupEl.textContent = 'Generating...';
  genBtn.disabled = true;
  genBtn.textContent = 'Generating...';

  const context = [
    'Business name: ' + name,
    'Type: ' + type,
    area ? 'Area: ' + area + ', San Antonio TX' : 'Location: San Antonio TX',
    hook ? 'Hook: ' + hook : ''
  ].filter(Boolean).join('\n');

  const prompt = `You are writing outreach messages for Rob Galvan, a San Antonio video creator and photographer. He runs Curbside Social Co. and shoots on Sony FX3 and Sony A7IV.

His offer: $150 for 3 short-form video reels. One collab reel goes on his page highlighting the business, the business keeps 2 reels to post themselves. Good for a dish, product, or upcoming event.

Platform: ${activePlatform}

Business info:
${context}

Write two messages. Casual, like a real person texting. Short sentences. No em dashes. No hashtags. Sound local and genuine. Don't open with "Hey there" or anything generic.

1. FIRST MESSAGE: Under 75 words. Mention the business by name. Sneak the offer in naturally, not as the opener.
2. FOLLOW-UP: 2 sentences max. Super low-key. No pressure. Under 40 words.

Respond ONLY with valid JSON, no markdown, no backticks:
{"pitch":"...","followup":"..."}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      errEl.textContent = 'API error: ' + (err.error?.message || res.status);
      errEl.style.display = 'block';
      pitchEl.textContent = '';
      followupEl.textContent = '';
      return;
    }

    const data = await res.json();
    const raw  = data.content.map(i => i.text || '').join('').trim();
    const clean = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    const parsed = JSON.parse(clean);

    pitchEl.classList.remove('msg-placeholder');
    pitchEl.textContent = parsed.pitch;
    followupEl.classList.remove('msg-placeholder');
    followupEl.textContent = parsed.followup;

  } catch (e) {
    errEl.textContent = 'Error: ' + e.message;
    errEl.style.display = 'block';
    pitchEl.textContent = '';
    followupEl.textContent = '';
  } finally {
    genBtn.disabled = false;
    genBtn.innerHTML = '<i class="ti ti-wand"></i> Generate messages';
  }
}

async function copyMsg(id, btn) {
  const text = document.getElementById(id).textContent;
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.innerHTML;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.innerHTML = orig, 2000);
  } catch (e) {}
}
