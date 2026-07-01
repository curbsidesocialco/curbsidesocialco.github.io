// Overview tab. Live dashboard numbers from /api/overview. Reuses API_URL
// (outreach.js) and escapeHtml (clients.js), both loaded before this file.

const OV_KIND_BADGE = { outreach: 'badge-sent', audit: 'badge-scheduled', project: 'badge-editing' };
const OV_KIND_LABEL = { outreach: 'Outreach', audit: 'Audit', project: 'Project' };

function ovMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Date-only formatting without timezone drift (matches projects.js fmtDate)
function ovFmtDate(d) {
  if (!d) return '';
  // d may be "2026-06-25" or a full ISO timestamp; take just the date part
  const dt = new Date(String(d).slice(0, 10) + 'T00:00:00Z');
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { timeZone: 'UTC' });
}

async function loadOverview() {
  const recentEl = document.getElementById('overview-recent');
  const upcomingEl = document.getElementById('overview-upcoming');
  if (!recentEl) return;
  try {
    const res = await fetch(`${API_URL}/api/overview`);
    const data = await res.json();

    document.getElementById('ov-leads').textContent = data.leads;
    document.getElementById('ov-active').textContent = data.activeClients;
    document.getElementById('ov-collected').textContent = ovMoney(data.collected);
    document.getElementById('ov-outstanding').textContent = ovMoney(data.outstanding);

    recentEl.innerHTML = (data.recent && data.recent.length) ? data.recent.map(r => `
      <div class="row">
        <div><div class="row-name">${escapeHtml(r.name || '')}</div><div class="row-sub">${escapeHtml(r.sub || '')}</div></div>
        <span class="badge ${OV_KIND_BADGE[r.kind] || 'badge-sent'}">${OV_KIND_LABEL[r.kind] || r.kind}</span>
      </div>`).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No activity yet. Log some outreach, audits, or projects.</p>';

    upcomingEl.innerHTML = (data.upcoming && data.upcoming.length) ? data.upcoming.map(u => `
      <div class="row">
        <div><div class="row-name">${escapeHtml(u.name || 'Project')}</div><div class="row-sub">${escapeHtml([u.title, u.package].filter(Boolean).join(' · '))}</div></div>
        <span style="font-size:12px;color:var(--text-2);">${ovFmtDate(u.shoot_date)}</span>
      </div>`).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No upcoming shoots scheduled.</p>';
  } catch (err) {
    recentEl.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">Could not load overview.</p>';
    if (upcomingEl) upcomingEl.innerHTML = '';
  }
}

async function loadReport() {
  const body = document.getElementById('report-body');
  if (!body) return;
  try {
    const res = await fetch(`${API_URL}/api/report`);
    const r = await res.json();
    const monthEl = document.getElementById('report-month');
    if (monthEl) monthEl.textContent = r.month ? '· ' + r.month : '';
    const stats = [
      ['Collected', ovMoney(r.collected)],
      ['Booked', `${ovMoney(r.booked)} (${r.projects})`],
      ['Delivered', r.delivered],
      ['New clients', r.newClients],
      ['Outreach sent', r.outreachSent],
      ['Audits run', r.auditsRun]
    ];
    body.innerHTML = '<div class="report-grid">' + stats.map(([label, val]) =>
      `<div class="report-stat"><div class="report-stat-val">${val}</div><div class="report-stat-label">${label}</div></div>`
    ).join('') + '</div>';
  } catch (e) {
    body.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">Could not load this month.</p>';
  }
}

async function emailReport(btn) {
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Sending...';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000); // never hang forever
    const res = await fetch(`${API_URL}/api/email/report`, { method: 'POST', signal: controller.signal });
    clearTimeout(timer);
    btn.innerHTML = res.ok ? '<i class="ti ti-check"></i> Sent, check your inbox' : 'Failed to send';
  } catch (e) {
    btn.innerHTML = 'Failed to send';
  }
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 4000);
}

document.addEventListener('DOMContentLoaded', loadOverview);
document.addEventListener('DOMContentLoaded', loadReport);
