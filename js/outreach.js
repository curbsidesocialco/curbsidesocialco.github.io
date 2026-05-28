let activePlatform = 'Instagram DM';

function setPlatform(platform, btnId) {
  activePlatform = platform;
  ['btn-ig', 'btn-fb', 'btn-email'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(btnId).classList.add('active');
}

function generatePitch() {
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

  const prompt = [
    'Generate outreach messages for:',
    'Business: ' + name,
    'Type: ' + type,
    area ? 'Area: ' + area + ', San Antonio TX' : 'Location: San Antonio TX',
    hook ? 'Hook: ' + hook : '',
    'Platform: ' + activePlatform
  ].filter(Boolean).join(' | ');

  navigator.clipboard.writeText(prompt).then(() => {
    const pitchEl = document.getElementById('pitch-text');
    pitchEl.classList.remove('msg-placeholder');
    pitchEl.textContent = 'Prompt copied to clipboard. Paste it into Claude, then copy the messages back here.';
  }).catch(() => {
    const pitchEl = document.getElementById('pitch-text');
    pitchEl.classList.remove('msg-placeholder');
    pitchEl.textContent = prompt;
  });
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
