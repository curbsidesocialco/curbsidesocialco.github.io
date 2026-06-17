// Site audit tab. Reuses the API_URL global declared in outreach.js, which loads
// before this file. Framing stays positive: looks-good for passes, easy-win for
// misses, each easy win with a short "what I'd do" line. Never a scare screen.

async function runAudit() {
  const url     = document.getElementById('audit-url').value.trim();
  const errEl   = document.getElementById('audit-error');
  const btn     = document.getElementById('audit-btn');
  const results = document.getElementById('audit-results');

  errEl.style.display = 'none';

  if (!url) {
    errEl.textContent = 'Please enter a website URL.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Checking the site...';

  try {
    const res = await fetch(`${API_URL}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.error || 'Could not run the audit. Try again.';
      errEl.style.display = 'block';
      return;
    }

    const data = await res.json();
    renderAudit(data);
    results.style.display = 'block';

  } catch (err) {
    errEl.textContent = 'Could not reach the server. Check your connection and try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-clipboard-check"></i> Run audit';
  }
}

function renderAudit(data) {
  // Site health card
  document.getElementById('audit-score').textContent = data.score;
  const winsEl = document.getElementById('audit-wins');
  winsEl.textContent = data.wins === 0
    ? 'All clear, no easy wins left'
    : data.wins + (data.wins === 1 ? ' easy win' : ' easy wins');

  // Tint the health card by score: green when strong, amber otherwise. Never red.
  const health = document.getElementById('audit-health');
  health.classList.remove('good', 'warn');
  health.classList.add(data.score >= 7 ? 'good' : 'warn');

  // Opportunity card
  document.getElementById('audit-opp-text').textContent = data.opportunity;

  // Findings: green looks-good rows, amber easy-win rows carrying the fix line
  const container = document.getElementById('audit-findings');
  container.innerHTML = data.findings.map(f => {
    if (f.pass) {
      return `
        <div class="finding good">
          <div class="finding-icon"><i class="ti ti-check"></i></div>
          <div class="finding-body">
            <div class="finding-label">${f.label}</div>
            <div class="finding-status">Looks good</div>
          </div>
        </div>`;
    }
    return `
      <div class="finding warn">
        <div class="finding-icon"><i class="ti ti-bulb"></i></div>
        <div class="finding-body">
          <div class="finding-label">${f.label} <span class="finding-tag">easy win</span></div>
          <div class="finding-fix">${f.fix}</div>
        </div>
      </div>`;
  }).join('');
}
