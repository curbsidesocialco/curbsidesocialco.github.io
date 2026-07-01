// Tasks / follow-ups. The connective tissue: shows what's due so nothing slips.
// Lives on the Overview. Reuses API_URL (outreach.js) and escapeHtml (clients.js).

let tasksCache = [];
let taskClients = [];

// Parse a date-only value as UTC and flag overdue / today without timezone drift
function taskDateInfo(due) {
  if (!due) return { label: '', cls: '' };
  // due may be "2026-06-25" or a full ISO timestamp; take just the date part
  const d = new Date(String(due).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(d.getTime())) return { label: '', cls: '' };
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const label = d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  if (d.getTime() < todayUTC.getTime()) return { label: label + ' · overdue', cls: 'task-overdue' };
  if (d.getTime() === todayUTC.getTime()) return { label: 'Today', cls: 'task-today' };
  return { label, cls: '' };
}

async function loadTasks() {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  try {
    const [tRes, cRes] = await Promise.all([
      fetch(`${API_URL}/api/tasks`),
      fetch(`${API_URL}/api/clients`)
    ]);
    tasksCache = await tRes.json();
    taskClients = await cRes.json();
    fillTaskClientOptions();
    renderTasks();
  } catch (e) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">Could not load tasks.</p>';
  }
}

function fillTaskClientOptions() {
  const sel = document.getElementById('task-client');
  if (!sel) return;
  sel.innerHTML = '';
  sel.add(new Option('No client', ''));
  taskClients.forEach(c => sel.add(new Option(c.business, c.id)));
}

function renderTasks() {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  const open = tasksCache.filter(t => !t.done);
  if (!open.length) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">Nothing on your list. Add a follow-up so it does not slip.</p>';
    return;
  }
  container.innerHTML = open.map(t => {
    const di = taskDateInfo(t.due_date);
    const ctx = [t.client_name, t.project_title].filter(Boolean).join(' · ');
    const metaParts = [];
    if (di.label) metaParts.push(`<span class="${di.cls}">${di.label}</span>`);
    if (ctx) metaParts.push(escapeHtml(ctx));
    return `
      <div class="task-row">
        <button class="task-check" onclick="toggleTask(${t.id})" title="Mark done"></button>
        <div style="flex:1;min-width:0;">
          <div class="task-title">${escapeHtml(t.title)}</div>
          ${metaParts.length ? `<div class="task-meta">${metaParts.join(' · ')}</div>` : ''}
        </div>
        <button class="icon-btn" onclick="deleteTask(${t.id})" title="Delete"><i class="ti ti-trash"></i></button>
      </div>`;
  }).join('');
}

async function addTask() {
  const titleEl = document.getElementById('task-title');
  const dueEl = document.getElementById('task-due');
  const clientEl = document.getElementById('task-client');
  const title = titleEl.value.trim();
  if (!title) { titleEl.focus(); return; }
  try {
    await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, due_date: dueEl.value || null, client_id: clientEl.value || null })
    });
    titleEl.value = '';
    dueEl.value = '';
    clientEl.value = '';
    await loadTasks();
  } catch (e) {
    console.error('Add task failed', e);
  }
}

async function toggleTask(id) {
  const t = tasksCache.find(x => x.id === id);
  if (!t) return;
  try {
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: t.title, due_date: t.due_date, done: !t.done,
        client_id: t.client_id, project_id: t.project_id, notes: t.notes
      })
    });
    await loadTasks();
  } catch (e) {
    console.error('Toggle task failed', e);
  }
}

async function deleteTask(id) {
  try {
    await fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (e) {
    console.error('Delete task failed', e);
  }
}

// Shared helpers so other tabs can drop a follow-up task (the connective tissue)
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function createTask(payload) {
  try {
    await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (typeof loadTasks === 'function') loadTasks(); // refresh the Overview list
    return true;
  } catch (e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', loadTasks);
