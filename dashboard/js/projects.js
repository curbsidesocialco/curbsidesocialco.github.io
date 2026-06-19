// Projects tab. Reuses API_URL (outreach.js) and escapeHtml (clients.js), both
// loaded before this file. togglePriceField stays here: the Outreach tab calls it.

function togglePriceField() {
  const offer = document.getElementById('biz-offer').value;
  const wrap = document.getElementById('price-field-wrap');
  wrap.style.display = (offer === 'none' || offer === 'free_intro') ? 'none' : 'block';
}

let projectsCache = [];
let projectClients = [];
let editingProjectId = null;

const PROJECT_STATUS_BADGE = { booked: 'badge-scheduled', shooting: 'badge-followup', editing: 'badge-editing', delivered: 'badge-delivered' };
const PROJECT_STATUS_LABEL = { booked: 'Booked', shooting: 'Shooting', editing: 'Editing', delivered: 'Delivered' };

function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Format a date-only value without timezone drift (shoot dates must not shift a day)
function fmtDate(d) {
  if (!d) return '';
  const dt = (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) ? new Date(d + 'T00:00:00Z') : new Date(d);
  return dt.toLocaleDateString('en-US', { timeZone: 'UTC' });
}

// pg may return a DATE as a string or a Date; normalize to YYYY-MM-DD for inputs
function dateInputValue(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try { return new Date(d).toISOString().slice(0, 10); } catch (e) { return ''; }
}

async function loadProjects() {
  const list = document.getElementById('projects-list');
  if (!list) return;
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${API_URL}/api/projects`),
      fetch(`${API_URL}/api/clients`)
    ]);
    projectsCache = await pRes.json();
    projectClients = await cRes.json();
    refreshDeliveryOptions();
    renderProjects(projectsCache);
  } catch (err) {
    list.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:12px 0;">Could not load projects.</p>';
  }
}

function renderProjects(list) {
  const container = document.getElementById('projects-list');
  if (!container) return;

  const rows = list.map(p => {
    const badge = PROJECT_STATUS_BADGE[p.status] || 'badge-scheduled';
    const statusLabel = PROJECT_STATUS_LABEL[p.status] || (p.status || 'Booked');
    const paidBadge = p.paid ? 'badge-delivered' : 'badge-followup';
    const paidLabel = p.paid ? 'Paid' : 'Unpaid';
    const shoot = fmtDate(p.shoot_date);
    const meta = [p.client_name || 'No client', p.package, shoot, p.delivery].filter(Boolean).join(' · ');
    const link = (p.delivery_link && /^https?:\/\//i.test(p.delivery_link))
      ? ' · <a href="' + escapeHtml(p.delivery_link) + '" target="_blank" rel="noopener">link</a>' : '';
    return `
      <div class="row">
        <div style="flex:1;min-width:0;padding-right:10px;">
          <div class="row-name">${escapeHtml(p.title || 'Project')} ${p.amount ? '· ' + money(p.amount) : ''}</div>
          <div class="row-sub">${escapeHtml(meta)}${link}</div>
        </div>
        <div class="project-row-actions">
          <span class="badge ${paidBadge}">${paidLabel}</span>
          <span class="badge ${badge}">${escapeHtml(statusLabel)}</span>
          <button class="icon-btn" onclick="editProject(${p.id})" title="Edit"><i class="ti ti-pencil"></i></button>
          <button class="icon-btn" onclick="deleteProject(${p.id})" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  const addTile = '<div class="add-row" onclick="showProjectForm()"><i class="ti ti-plus"></i> Add project</div>';
  const empty = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No projects yet. Add your first booked job.</p>';
  container.innerHTML = (list.length ? rows : empty) + addTile;
}

// Seed the delivery suggestions with common methods plus any Rob has already used,
// so a new method he types once shows up as a suggestion next time.
function refreshDeliveryOptions() {
  const dl = document.getElementById('delivery-options');
  if (!dl) return;
  const defaults = ['Apple shared album', 'Dropbox', 'Pictime', 'Google Drive', 'WeTransfer', 'Frame.io'];
  const used = projectsCache.map(p => p.delivery).filter(Boolean);
  const all = [...new Set([...defaults, ...used])];
  dl.innerHTML = all.map(v => `<option value="${escapeHtml(v)}"></option>`).join('');
}

// Pull the latest clients so the dropdown includes any added since page load
async function refreshProjectClients() {
  try {
    const res = await fetch(`${API_URL}/api/clients`);
    projectClients = await res.json();
  } catch (e) { /* keep the existing cache if the fetch fails */ }
}

function fillProjectClientOptions(selectedId) {
  const sel = document.getElementById('project-client');
  if (!sel) return;
  sel.innerHTML = '';
  sel.add(new Option('Select client...', ''));
  projectClients.forEach(c => sel.add(new Option(c.business, c.id)));
  sel.add(new Option('+ Add new client', '__new__'));
  if (selectedId != null) sel.value = String(selectedId);
}

// Reveal the "New client name" input only when "+ Add new client" is picked
function toggleNewClientField() {
  const wrap = document.getElementById('project-new-client-wrap');
  if (!wrap) return;
  wrap.style.display = document.getElementById('project-client').value === '__new__' ? 'flex' : 'none';
}

async function showProjectForm(project) {
  await refreshProjectClients(); // always show the latest clients, including ones just added
  editingProjectId = project ? project.id : null;
  document.getElementById('project-form-title').textContent = project ? 'Edit project' : 'Add a project';
  fillProjectClientOptions(project ? project.client_id : null);
  document.getElementById('project-title').value = project ? (project.title || '') : '';
  document.getElementById('project-package').value = project ? (project.package || '') : '';
  document.getElementById('project-amount').value = project && project.amount != null ? project.amount : '';
  document.getElementById('project-status').value = project ? (project.status || 'booked') : 'booked';
  document.getElementById('project-paid').value = project && project.paid ? 'true' : 'false';
  document.getElementById('project-shoot-date').value = project ? dateInputValue(project.shoot_date) : '';
  document.getElementById('project-delivery').value = project ? (project.delivery || '') : '';
  document.getElementById('project-delivery-link').value = project ? (project.delivery_link || '') : '';
  document.getElementById('project-new-client').value = '';
  toggleNewClientField();
  document.getElementById('project-error').style.display = 'none';
  const card = document.getElementById('project-form-card');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function editProject(id) {
  const p = projectsCache.find(x => x.id === id);
  if (p) showProjectForm(p);
}

function hideProjectForm() {
  document.getElementById('project-form-card').style.display = 'none';
  editingProjectId = null;
}

async function saveProject() {
  let clientId = document.getElementById('project-client').value;
  const errEl = document.getElementById('project-error');
  const saveBtn = document.getElementById('project-save-btn');

  errEl.style.display = 'none';
  if (!clientId) {
    errEl.textContent = 'Please choose a client for this project.';
    errEl.style.display = 'block';
    return;
  }
  const newClientName = clientId === '__new__' ? document.getElementById('project-new-client').value.trim() : '';
  if (clientId === '__new__' && !newClientName) {
    errEl.textContent = 'Enter a name for the new client.';
    errEl.style.display = 'block';
    return;
  }

  const amountRaw = document.getElementById('project-amount').value.trim();
  const payload = {
    title: document.getElementById('project-title').value.trim(),
    package: document.getElementById('project-package').value,
    amount: amountRaw === '' ? null : Number(amountRaw),
    status: document.getElementById('project-status').value,
    paid: document.getElementById('project-paid').value === 'true',
    shoot_date: document.getElementById('project-shoot-date').value || null,
    delivery: document.getElementById('project-delivery').value || null,
    delivery_link: document.getElementById('project-delivery-link').value.trim() || null
  };

  const editing = editingProjectId !== null;
  const url = editing ? `${API_URL}/api/projects/${editingProjectId}` : `${API_URL}/api/projects`;
  const method = editing ? 'PATCH' : 'POST';

  saveBtn.disabled = true;
  const orig = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="ti ti-loader"></i> Saving...';

  try {
    // "+ Add new client": create the client first, then attach the project to it
    if (clientId === '__new__') {
      const cRes = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: newClientName, status: 'active' })
      });
      if (!cRes.ok) {
        errEl.textContent = 'Could not create the new client. Try again.';
        errEl.style.display = 'block';
        return;
      }
      clientId = (await cRes.json()).id;
    }
    payload.client_id = clientId;

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.error || 'Could not save the project. Try again.';
      errEl.style.display = 'block';
      return;
    }
    hideProjectForm();
    await loadProjects();
  } catch (err) {
    errEl.textContent = 'Could not reach the server. Check your connection and try again.';
    errEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = orig;
  }
}

async function deleteProject(id) {
  const p = projectsCache.find(x => x.id === id);
  const label = p ? (p.title || 'this project') : 'this project';
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
  try {
    await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
    await loadProjects();
  } catch (err) {
    console.error('Delete project failed', err);
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
