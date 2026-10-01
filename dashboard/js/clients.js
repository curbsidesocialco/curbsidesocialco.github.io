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

const STATUS_BADGE = { lead: 'badge-followup', contacted: 'badge-scheduled', active: 'badge-delivered', past: 'badge-sent' };
const STATUS_LABEL = { lead: 'Lead', contacted: 'Contacted', active: 'Active', past: 'Past client' };

// Outreach entry statuses (matches the map in outreach.js)
const OUTREACH_STATUS_BADGE = {
  sent: 'badge-sent', followup: 'badge-followup', replied: 'badge-replied',
  booked: 'badge-delivered', declined: 'badge-editing'
};

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

// The person's name when we have one, otherwise the business
function clientPerson(c) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ');
}
function clientDisplayName(c) {
  return clientPerson(c) || c.business;
}

// Tappable phone / email / website rows (call or email straight from the phone)
function contactRows(c) {
  const rows = [];
  if (c.phone) rows.push(['Phone', `<a href="tel:${escapeHtml(c.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(c.phone)}</a>`]);
  if (c.email) rows.push(['Email', `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>`]);
  if (c.website) {
    const href = /^https?:\/\//i.test(c.website) ? c.website : 'https://' + c.website;
    rows.push(['Website', `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(c.website.replace(/^https?:\/\//i, ''))}</a>`]);
  }
  if (c.contact) rows.push(['Contact', escapeHtml(c.contact)]);
  return rows.map(([label, val]) =>
    `<div class="client-row"><span class="client-row-label">${label}</span><span class="client-row-val">${val}</span></div>`).join('');
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
    filterClients();
  } catch (err) {
    grid.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:12px 0;">Could not load clients.</p>';
  }
}

// Filter the grid by search text + status (falls back to the full list)
function filterClients() {
  const q = (document.getElementById('client-search') && document.getElementById('client-search').value || '').trim().toLowerCase();
  const status = (document.getElementById('client-status-filter') && document.getElementById('client-status-filter').value) || '';
  let list = clientsCache;
  if (status) list = list.filter(c => c.status === status);
  if (q) list = list.filter(c => [c.business, c.first_name, c.last_name, c.type, c.area, c.email, c.phone, c.source, c.notes]
    .filter(Boolean).join(' ').toLowerCase().includes(q));
  renderClients(list);
}

function renderClients(list) {
  const grid = document.getElementById('clients-grid');
  if (!grid) return;

  const cards = list.map(c => {
    const [bgVar, textVar] = clientColor(c.business);
    const badge = STATUS_BADGE[c.status] || 'badge-sent';
    const statusLabel = STATUS_LABEL[c.status] || (c.status || 'Lead');
    const name = clientDisplayName(c);
    const sub = [clientPerson(c) ? c.business : null, c.type, c.area].filter(Boolean).join(' / ');
    return `
      <div class="client-card">
        <div class="client-top client-top-link" onclick="openClient(${c.id})" title="Open client">
          <div class="client-avatar" style="background:var(${bgVar});color:var(${textVar});">${escapeHtml(clientInitials(name))}</div>
          <div><div class="client-name">${escapeHtml(name)}</div><div class="client-type">${escapeHtml(sub || 'Local business')}</div></div>
        </div>
        ${contactRows(c)}
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
  document.getElementById('client-first').value    = client ? (client.first_name || '') : '';
  document.getElementById('client-last').value     = client ? (client.last_name || '') : '';
  document.getElementById('client-business').value = client ? (client.business || '') : '';
  document.getElementById('client-phone').value    = client ? (client.phone || '') : '';
  document.getElementById('client-email').value    = client ? (client.email || '') : '';
  document.getElementById('client-website').value  = client ? (client.website || '') : '';
  document.getElementById('client-source').value   = client ? (client.source || '') : '';
  document.getElementById('client-type').value     = client ? (client.type || '') : '';
  document.getElementById('client-area').value     = client ? (client.area || '') : '';
  document.getElementById('client-contact').value  = client ? (client.contact || '') : '';
  document.getElementById('client-status').value   = client ? (client.status || 'lead') : 'lead';
  document.getElementById('client-notes').value    = client ? (client.notes || '') : '';
  document.getElementById('client-error').style.display = 'none';
  const card = document.getElementById('client-form-card');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('client-first').focus();
}

function editClient(id) {
  const client = clientsCache.find(c => c.id === id);
  if (!client) return;
  showGridView();        // editing always happens from the grid (form sits above it)
  showClientForm(client);
}

// ---- Detail view ----
function showGridView() {
  document.getElementById('client-detail').style.display = 'none';
  document.getElementById('clients-grid').style.display = ''; // restore the CSS grid
  const filter = document.getElementById('client-filter');
  if (filter) filter.style.display = '';
}

function backToClients() {
  hideClientForm();
  showGridView();
  loadClients();
}

async function openClient(id) {
  const detail = document.getElementById('client-detail');
  hideClientForm();
  document.getElementById('clients-grid').style.display = 'none';
  const filter = document.getElementById('client-filter');
  if (filter) filter.style.display = 'none';
  detail.style.display = 'block';
  detail.innerHTML = '<div class="card"><p style="font-size:13px;color:var(--text-3);">Loading...</p></div>';
  try {
    const res = await fetch(`${API_URL}/api/clients/${id}`);
    if (!res.ok) throw new Error('not ok');
    renderClientDetail(await res.json());
  } catch (err) {
    detail.innerHTML = '<div class="card"><p style="font-size:13px;color:var(--text-3);">Could not load this client. <a href="#" onclick="backToClients();return false;">Back to clients</a></p></div>';
  }
}

function renderClientDetail(c) {
  const [bgVar, textVar] = clientColor(c.business);
  const badge = STATUS_BADGE[c.status] || 'badge-sent';
  const statusLabel = STATUS_LABEL[c.status] || (c.status || 'Lead');
  const name = clientDisplayName(c);
  const typeArea = [clientPerson(c) ? c.business : null, c.type, c.area].filter(Boolean).join(' / ');
  const outreach = c.outreach || [];

  const history = outreach.length ? outreach.map(o => {
    const date = new Date(o.created_at).toLocaleDateString();
    const oBadge = OUTREACH_STATUS_BADGE[o.status] || 'badge-sent';
    const pitch = o.pitch || '';
    const snippet = pitch.slice(0, 120) + (pitch.length > 120 ? '…' : '');
    return `
      <div class="row">
        <div style="flex:1;min-width:0;padding-right:10px;">
          <div class="row-name">${escapeHtml(o.platform || 'Message')} · ${date}</div>
          <div class="row-sub">${escapeHtml(snippet)}</div>
        </div>
        <span class="badge ${oBadge}">${escapeHtml(o.status || 'sent')}</span>
      </div>`;
  }).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No outreach linked to this client yet. Generate a message in the Outreach tab and link it here.</p>';

  const audits = c.audits || [];
  const auditHistory = audits.length ? audits.map(a => {
    const date = new Date(a.created_at).toLocaleDateString();
    const aBadge = (a.score >= 7) ? 'badge-delivered' : 'badge-followup'; // green when strong, amber otherwise, never red
    let host = a.url || 'site';
    try { host = new URL(a.url).hostname.replace(/^www\./, ''); } catch (e) {}
    return `
      <div class="row">
        <div style="flex:1;min-width:0;padding-right:10px;">
          <div class="row-name">${escapeHtml(host)} · ${date}</div>
          <div class="row-sub">${escapeHtml(a.opportunity || '')}${a.platform ? ' · ' + escapeHtml(a.platform) : ''}</div>
        </div>
        <span class="badge ${aBadge}">${a.score}/${a.total}</span>
      </div>`;
  }).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No audits saved for this client yet. Run one in the Audit tab and save it here.</p>';

  const projects = c.projects || [];
  let totalVal = 0, collectedVal = 0;
  projects.forEach(p => { totalVal += Number(p.amount || 0); if (p.paid) collectedVal += Number(p.amount || 0); });
  const projBadge = { booked: 'badge-scheduled', shooting: 'badge-followup', editing: 'badge-editing', delivered: 'badge-delivered' };
  const dollars = n => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const projectHistory = projects.length ? projects.map(p => {
    const badge = projBadge[p.status] || 'badge-scheduled';
    const amt = p.amount ? ' · ' + dollars(p.amount) : '';
    return `
      <div class="row">
        <div style="flex:1;min-width:0;padding-right:10px;">
          <div class="row-name">${escapeHtml(p.title || 'Project')}${amt}</div>
          <div class="row-sub">${escapeHtml([p.package, p.delivery].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="project-row-actions">
          <span class="badge ${p.paid ? 'badge-delivered' : 'badge-followup'}">${p.paid ? 'Paid' : 'Unpaid'}</span>
          <span class="badge ${badge}">${escapeHtml(p.status || 'booked')}</span>
        </div>
      </div>`;
  }).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No projects yet. Add one in the Projects tab.</p>';
  const projectTotal = projects.length
    ? `<div class="row"><div class="row-name">Total</div><div style="font-weight:600;">${dollars(totalVal)} <span style="color:var(--text-2);font-weight:400;">(collected ${dollars(collectedVal)})</span></div></div>`
    : '';

  document.getElementById('client-detail').innerHTML = `
    <div class="detail-bar">
      <button class="client-cancel-btn" onclick="backToClients()"><i class="ti ti-arrow-left"></i> Back to clients</button>
    </div>
    <div class="card">
      <div class="client-top">
        <div class="client-avatar" style="background:var(${bgVar});color:var(${textVar});">${escapeHtml(clientInitials(name))}</div>
        <div><div class="client-name" style="font-size:17px;">${escapeHtml(name)}</div><div class="client-type">${escapeHtml(typeArea || 'Local business')}</div></div>
      </div>
      <div class="client-row"><span class="client-row-label">Status</span><span class="client-row-val"><span class="badge ${badge}">${escapeHtml(statusLabel)}</span></span></div>
      ${contactRows(c)}
      ${c.source ? `<div class="client-row"><span class="client-row-label">How you met</span><span class="client-row-val">${escapeHtml(c.source)}</span></div>` : ''}
      ${c.notes ? `<div class="client-row"><span class="client-row-label">Notes</span><span class="client-row-val">${escapeHtml(c.notes)}</span></div>` : ''}
      <div class="client-actions">
        <button onclick="editClient(${c.id})"><i class="ti ti-pencil"></i> Edit</button>
        <button onclick="deleteClient(${c.id})"><i class="ti ti-trash"></i> Delete</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Projects</div>
      ${projectHistory}
      ${projectTotal}
    </div>
    <div class="card">
      <div class="card-title">Outreach history</div>
      ${history}
    </div>
    <div class="card">
      <div class="card-title">Audit history</div>
      ${auditHistory}
    </div>`;
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
    first_name: document.getElementById('client-first').value.trim(),
    last_name:  document.getElementById('client-last').value.trim(),
    phone:      document.getElementById('client-phone').value.trim(),
    email:      document.getElementById('client-email').value.trim(),
    website:    document.getElementById('client-website').value.trim(),
    source:     document.getElementById('client-source').value.trim(),
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
  const name = client ? clientDisplayName(client) : 'this client';
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try {
    await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
    showGridView();
    await loadClients();
  } catch (err) {
    console.error('Delete client failed', err);
  }
}

document.addEventListener('DOMContentLoaded', loadClients);
