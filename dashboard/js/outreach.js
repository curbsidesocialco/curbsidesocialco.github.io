const API_URL = 'https://api-production-eab8a.up.railway.app';

let activePlatform = 'Instagram DM';
let outreachClients = []; // cached client list for the "Link to client" picker

function setPlatform(platform, btnId) {
  activePlatform = platform;
  ['btn-ig', 'btn-fb', 'btn-email'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(btnId).classList.add('active');
}

async function generatePitch() {
  const name         = document.getElementById('biz-name').value.trim();
  const type         = document.getElementById('biz-type').value;
  const area         = document.getElementById('biz-area').value.trim();
  const hook         = document.getElementById('biz-hook').value.trim();
  const relationship = document.getElementById('biz-relationship').value;
  const offer        = document.getElementById('biz-offer').value;
  const price        = document.getElementById('biz-price').value.trim();
  const errEl        = document.getElementById('outreach-error');
  const genBtn       = document.getElementById('gen-btn');
  const pitchEl      = document.getElementById('pitch-text');
  const followupEl   = document.getElementById('followup-text');

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
      body: JSON.stringify({ name, type, area, hook, platform: activePlatform, relationship, offer, price })
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

    // Store generated messages for logging
    window._lastPitch = { business: name, type, area, relationship, offer, price, platform: activePlatform, pitch: data.pitch, followup: data.followup };

    // Show log button and tailor the client picker to this business
    document.getElementById('log-btn-wrap').style.display = 'block';
    prepareClientLink(name);

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

async function logOutreach() {
  if (!window._lastPitch) return;
  const logBtn = document.getElementById('log-btn');
  const clientSel = document.getElementById('outreach-client');
  let clientId = clientSel ? clientSel.value : '';
  logBtn.disabled = true;
  logBtn.textContent = 'Saving...';

  try {
    // "+ New client from this business": create the client first, then link to it
    if (clientId === '__new__') {
      const p = window._lastPitch;
      const cRes = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: p.business, type: p.type, area: p.area, contact: p.platform, status: 'lead' })
      });
      if (cRes.ok) {
        const newClient = await cRes.json();
        clientId = newClient.id;
        if (typeof loadClients === 'function') loadClients(); // refresh the Clients tab
        loadClientOptions();                                  // refresh this dropdown
      } else {
        clientId = '';
      }
    }

    const res = await fetch(`${API_URL}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...window._lastPitch, status: 'sent', client_id: clientId || null })
    });

    if (res.ok) {
      logBtn.textContent = 'Logged!';
      loadOutreachLog();
      setTimeout(() => {
        logBtn.textContent = 'Log this outreach';
        logBtn.disabled = false;
        document.getElementById('log-btn-wrap').style.display = 'none';
        window._lastPitch = null;
      }, 2000);
    }
  } catch (err) {
    logBtn.textContent = 'Failed to log';
    logBtn.disabled = false;
  }
}

async function loadOutreachLog() {
  const container = document.getElementById('outreach-log-entries');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/api/log`);
    const entries = await res.json();

    if (!entries.length) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:12px 0;">No outreach logged yet. Generate a message and hit Log.</p>';
      return;
    }

    const statusColors = {
      sent: 'badge-sent',
      followup: 'badge-followup',
      replied: 'badge-replied',
      booked: 'badge-delivered',
      declined: 'badge-editing'
    };

    container.innerHTML = entries.map(e => `
      <div class="row" id="log-entry-${e.id}">
        <div>
          <div class="row-name">${e.business}</div>
          <div class="row-sub">${e.type || ''} ${e.area ? '/ ' + e.area : ''} — ${new Date(e.created_at).toLocaleDateString()}${e.client_name ? ' · <span class="log-client-tag"><i class="ti ti-user"></i> ' + e.client_name + '</span>' : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <select onchange="updateLogStatus(${e.id}, this.value)" style="font-size:11px;padding:3px 6px;border:1px solid var(--border-med);background:var(--surface2);color:var(--text);border-radius:var(--radius-sm);">
            <option value="sent" ${e.status==='sent'?'selected':''}>Sent</option>
            <option value="followup" ${e.status==='followup'?'selected':''}>Follow up</option>
            <option value="replied" ${e.status==='replied'?'selected':''}>Replied</option>
            <option value="booked" ${e.status==='booked'?'selected':''}>Booked</option>
            <option value="declined" ${e.status==='declined'?'selected':''}>Declined</option>
          </select>
          <span class="badge ${statusColors[e.status] || 'badge-sent'}">${e.status}</span>
          <button onclick="deleteLogEntry(${e.id})" style="font-size:11px;padding:3px 8px;border:1px solid var(--border-med);background:none;color:var(--text-3);cursor:pointer;border-radius:var(--radius-sm);">✕</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:12px 0;">Could not load log.</p>';
  }
}

async function updateLogStatus(id, status) {
  try {
    await fetch(`${API_URL}/api/log/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadOutreachLog();
  } catch (err) {
    console.error('Status update failed', err);
  }
}

async function deleteLogEntry(id) {
  try {
    await fetch(`${API_URL}/api/log/${id}`, { method: 'DELETE' });
    document.getElementById(`log-entry-${id}`)?.remove();
  } catch (err) {
    console.error('Delete failed', err);
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

// Fill the "Link to client" dropdown with existing clients. Uses new Option()
// so business names are inserted safely without manual escaping.
async function loadClientOptions() {
  const sel = document.getElementById('outreach-client');
  if (!sel) return;
  try {
    const res = await fetch(`${API_URL}/api/clients`);
    outreachClients = await res.json();
    sel.innerHTML = '';
    sel.add(new Option("Don't add to clients", ''));
    outreachClients.forEach(c => sel.add(new Option(c.business, c.id)));
    sel.add(new Option('+ Add as a new client', '__new__'));
  } catch (err) {
    outreachClients = [];
    sel.innerHTML = '';
    sel.add(new Option("Don't add to clients", ''));
  }
}

// Tailor the picker to the business just generated: name the "new client" option,
// and auto-select an existing client when the business is already in the list.
function prepareClientLink(name) {
  const sel = document.getElementById('outreach-client');
  if (!sel) return;
  const newOpt = Array.from(sel.options).find(o => o.value === '__new__');
  if (newOpt) newOpt.text = name ? `+ Add "${name}" as a new client` : '+ Add as a new client';
  const match = outreachClients.find(c => (c.business || '').trim().toLowerCase() === name.trim().toLowerCase());
  sel.value = match ? String(match.id) : '';
}

// Load log + client options on page ready
document.addEventListener('DOMContentLoaded', () => {
  loadOutreachLog();
  loadClientOptions();
});
