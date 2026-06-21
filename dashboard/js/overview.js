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
        <div><div class="row-name">${escapeHtml(u.name || 'Shoot')}</div><div class="row-sub">${escapeHtml(u.title || '')}</div></div>
        <span style="font-size:12px;color:var(--text-2);">${ovFmtDate(u.shoot_date)}</span>
      </div>`).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No upcoming shoots scheduled.</p>';
  } catch (err) {
    recentEl.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">Could not load overview.</p>';
    if (upcomingEl) upcomingEl.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', loadOverview);
