// Outreach message generator — calls Curbside Social Co. backend API

const API_URL = 'https://api-production-eab8a.up.railway.app';

let activePlatform = 'Instagram DM';

function setPlatform(platform, btnId) {
  activePlatform = platform;
  ['btn-ig', 'btn-fb', 'btn-email'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(btnId).classList.add('active');
}

async function generatePitch() {
  const name    = document.getElementById('biz-name').value.trim();
  const type    = document.getElementById('biz-type').value;
  const area    = document.getElementById('biz-area').value.trim();
  const hook    = document.getElementById('biz-hook').value.trim();
  const errEl   = document.getElementById('outreach-error');
  const genBtn  = document.getElementById('gen-btn');
  const pitchEl = document.getElementById('pitch-text');
  const followupEl = document.getElementById('followup-text');

  errEl.style.display = 'none';

  if (!name || !type) {
    errEl.textContent = 'Please enter a business name and select a type.';
    errEl.style.display = 'block';
    return;
  }

  genBtn.disabled = true;
  genBtn.innerHTML = '<i class="ti ti-loader"></i> Generating...';
  pitchEl.classList.add('msg-placeholder');
  pitchEl.textContent = 'Writing your message...';
  followupEl.classList.add('msg-placeholder');
  followupEl.textContent = 'Writing follow-up...';

  try {
    const res = await fetch(`${API_URL}/api/outreach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, area, hook, platform: activePlatform })
    });

    if (!res.ok) {
      const err = await res.json();
      errEl.textContent = 'Error: ' + (err.error || res.status);
      errEl.style.display = 'block';
      pitchEl.textContent = '';
      followupEl.textContent = '';
      return;
    }

    const data = await res.json();

    pitchEl.classList.remove('msg-placeholder');
    pitchEl.textContent = data.pitch;
    followupEl.classList.remove('msg-placeholder');
    followupEl.textContent = data.followup;

  } catch (err) {
    errEl.textContent = 'Could not reach server. Check your connection and try again.';
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
