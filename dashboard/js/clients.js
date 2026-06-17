// Clients tab CRM. Reuses the API_URL global declared in outreach.js, which
// loads before this file. Step 1: manual add / edit / delete of real clients.

let clientsCache = [];
let editingClientId = null;

const CLIENT_PALETTE = [
  ['--green-bg', '--green-text'],
  ['--amber-bg', '--amber-text'],
  ['--blue-bg', '--blue-text'],
  ['--red-bg', '--red-text'],
  ['--purple-bg', '--purple-text']
];

const STATUS_BADGE = { lead: 'badge-followup', active: 'badge-delivered', past: 'badge-sent' };
const STATUS_LABEL = { lead: 'Lead', active: 'Active', past: 'Past client' };

// Client data is user-entered, so escape it before dropping into HTML
function escapeHtml(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function clientInitials(business) {
  const words = (business || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function clientColor(business) {
  let sum = 0;
  for (const ch of (business || '')) sum += ch.charCodeAt(0);
  return CLIENT_PALETTE[sum % CLIENT_PALETTE.length];
}

async function loadClients() {
  const grid = document.getElementById('clients-grid');
  if (!grid) return;
  try {
    const res = await fetch(`${API_URL}/api/clients`);
    clientsCache = await res.json();
    renderClients(clientsCache);
  } catch (err) {
    grid.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:12px 0;">Could not load clients.</p>';
  }
}

function renderClients(list) {
  const grid = document.getElementById('clients-grid');
  if (!grid) return;

  const cards = list.map(c => {
    const [bgVar, textVar] = clientColor(c.business);
    const badge = STATUS_BADGE[c.status] || 'badge-sent';
    const statusLabel = STATUS_LABEL[c.status] || (c.status || 'Lead');
    const typeArea = [c.type, c.area].filter(Boolean).join(' / ');
    return `
      <div class="client-card">
        <div class="client-top">
          <div class="client-avatar" style="background:var(${bgVar});color:var(${textVar});">${escapeHtml(clientInitials(c.business))}</div>
          <div><div class="client-name">${escapeHtml(c.business)}</div><div class="client-type">${escapeHtml(typeArea || 'Local business')}</div></div>
        </div>
        ${c.contact ? `<div class="client-row"><span class="client-row-label">Contact</span><span class="client-row-val">${escapeHtml(c.contact)}</span></div>` : ''}
        <div class="client-row"><span class="client-row-label">Status</span><span class="client-row-val"><span class="badge ${badge}">${escapeHtml(statusLabel)}</span></span></div>
        ${c.notes ? `<div class="client-row"><span class="client-row-label">Notes</span><span class="client-row-val">${escapeHtml(c.notes)}</span></div>` : ''}
        <div class="client-actions">
          <button onclick="editClient(${c.id})"><i class="ti ti-pencil"></i> Edit</button>
          <button onclick="deleteClient(${c.id})"><i class="ti ti-trash"></i> Delete</button>
        </div>
      </div>`;
  }).join('');

  const addTile = `
    <div class="add-client" onclick="showClientForm()">
      <i class="ti ti-plus"></i><span>Add client</span>
    </div>`;

  grid.innerHTML = cards + addTile;
}

function showClientForm(client) {
  editingClientId = client ? client.id : null;
  document.getElementById('client-form-title').textContent = client ? 'Edit client' : 'Add a client';
  document.getElementById('client-business').value = client ? (client.business || '') : '';
  document.getElementById('client-type').value     = client ? (client.type || '') : '';
  document.getElementById('client-area').value     = client ? (client.area || '') : '';
  document.getElementById('client-contact').value  = client ? (client.contact || '') : '';
  document.getElementById('client-status').value   = client ? (client.status || 'lead') : 'lead';
  document.getElementById('client-notes').value    = client ? (client.notes || '') : '';
  document.getElementById('client-error').style.display = 'none';
  const card = document.getElementById('client-form-card');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('client-business').focus();
}

function editClient(id) {
  const client = clientsCache.find(c => c.id === id);
  if (client) showClientForm(client);
}

function hideClientForm() {
  document.getElementById('client-form-card').style.display = 'none';
  editingClientId = null;
}

async function saveClient() {
  const business = document.getElementById('client-business').value.trim();
  const errEl = document.getElementById('client-error');
  const saveBtn = document.getElementById('client-save-btn');

  errEl.style.display = 'none';
  if (!business) {
    errEl.textContent = 'Please enter a business name.';
    errEl.style.display = 'block';
    return;
  }

  const payload = {
    business,
    type:    document.getElementById('client-type').value,
    area:    document.getElementById('client-area').value.trim(),
    contact: document.getElementById('client-contact').value.trim(),
    status:  document.getElementById('client-status').value,
    notes:   document.getElementById('client-notes').value.trim()
  };

  const editing = editingClientId !== null;
  const url = editing ? `${API_URL}/api/clients/${editingClientId}` : `${API_URL}/api/clients`;
  const method = editing ? 'PATCH' : 'POST';

  saveBtn.disabled = true;
  const origHtml = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="ti ti-loader"></i> Saving...';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.error || 'Could not save client. Try again.';
      errEl.style.display = 'block';
      return;
    }
    hideClientForm();
    await loadClients();
  } catch (err) {
    errEl.textContent = 'Could not reach the server. Check your connection and try again.';
    errEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = origHtml;
  }
}

async function deleteClient(id) {
  const client = clientsCache.find(c => c.id === id);
  const name = client ? client.business : 'this client';
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try {
    await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
    await loadClients();
  } catch (err) {
    console.error('Delete client failed', err);
  }
}

document.addEventListener('DOMContentLoaded', loadClients);
