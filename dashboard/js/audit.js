// Site audit tab. Reuses the API_URL global declared in outreach.js, which loads
// before this file. Framing stays positive: looks-good for passes, easy-win for
// misses, each easy win with a short "what I'd do" line. Never a scare screen.

let auditClients = []; // cached client list for the audit "Save to client" picker

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

    // Remember this audit and tailor the save picker to the business
    const name = document.getElementById('audit-name').value.trim();
    window._lastAudit = {
      business: name, url: data.url, score: data.score, total: data.total,
      wins: data.wins, opportunity: data.opportunity, findings: data.findings
    };
    prepareAuditClientLink(name);
    const savedMsg = document.getElementById('audit-save-msg');
    if (savedMsg) savedMsg.style.display = 'none';

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

// ---- Save an audit to a client ----
async function loadAuditClientOptions() {
  const sel = document.getElementById('audit-client');
  if (!sel) return;
  try {
    const res = await fetch(`${API_URL}/api/clients`);
    auditClients = await res.json();
    sel.innerHTML = '';
    sel.add(new Option("Don't save yet", ''));
    auditClients.forEach(c => sel.add(new Option(c.business, c.id)));
    sel.add(new Option('+ Add as a new client', '__new__'));
  } catch (err) {
    auditClients = [];
    sel.innerHTML = '';
    sel.add(new Option("Don't save yet", ''));
  }
}

// Name the new-client option and auto-select an existing client by business name
function prepareAuditClientLink(name) {
  const sel = document.getElementById('audit-client');
  if (!sel) return;
  const newOpt = Array.from(sel.options).find(o => o.value === '__new__');
  if (newOpt) newOpt.text = name ? `+ Add "${name}" as a new client` : '+ Add as a new client';
  const match = name ? auditClients.find(c => (c.business || '').trim().toLowerCase() === name.trim().toLowerCase()) : null;
  sel.value = match ? String(match.id) : '';
}

async function saveAudit() {
  if (!window._lastAudit) return;
  const sel = document.getElementById('audit-client');
  const btn = document.getElementById('audit-save-btn');
  const msg = document.getElementById('audit-save-msg');
  let clientId = sel ? sel.value : '';

  msg.style.display = 'none';
  msg.className = 'audit-save-msg';

  if (!clientId) {
    msg.textContent = 'Pick a client, or add a new one, to save this audit.';
    msg.classList.add('err');
    msg.style.display = 'block';
    return;
  }

  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = 'Saving...';

  try {
    const a = window._lastAudit;

    // "+ Add as a new client": create the client first, then save the audit to it
    if (clientId === '__new__') {
      const business = a.business || (a.url ? new URL(a.url).hostname.replace(/^www\./, '') : 'New client');
      const cRes = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business, status: 'lead' })
      });
      if (!cRes.ok) throw new Error('client create failed');
      const newClient = await cRes.json();
      clientId = newClient.id;
      loadAuditClientOptions();                              // refresh this dropdown
      if (typeof loadClients === 'function') loadClients();  // refresh the Clients tab
    }

    const res = await fetch(`${API_URL}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId, url: a.url, score: a.score, total: a.total,
        wins: a.wins, opportunity: a.opportunity, findings: a.findings
      })
    });
    if (!res.ok) throw new Error('audit save failed');

    msg.textContent = 'Saved to client.';
    msg.classList.add('ok');
    msg.style.display = 'block';
  } catch (err) {
    msg.textContent = 'Could not save the audit. Try again.';
    msg.classList.add('err');
    msg.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

document.addEventListener('DOMContentLoaded', loadAuditClientOptions);
