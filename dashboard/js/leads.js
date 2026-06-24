// Lead-finder. Search Google Places (via the backend) by industry + area, then
// audit a result or add it as a client. Reuses API_URL + escapeHtml + the global
// runAudit/switchTab/loadClients.

let lastLeads = [];

// Browsable industry ideas so Rob never has to remember them. Leans toward
// under-marketed, high-ticket local verticals (few creators competing).
const INDUSTRY_GROUPS = [
  ['Home & trade', ['Roofing', 'HVAC', 'Plumbing', 'Electrician', 'Solar installer', 'Remodeling', 'Home builder', 'Pool builder', 'Landscaping', 'Painting', 'Pest control', 'Cleaning service']],
  ['Auto', ['Auto detailing', 'Auto repair', 'Body shop', 'Car dealership']],
  ['Health', ['Dental practice', 'Chiropractor', 'Physical therapy', 'Veterinarian', 'Med spa', 'Optometrist', 'Wellness clinic']],
  ['Pro services', ['Law firm', 'Real estate', 'Accountant', 'Financial advisor', 'Architect', 'Interior designer']],
  ['Local & visual', ['Jewelry store', 'Furniture store', 'Florist', 'Boutique', 'Brewery', 'Winery', 'Coffee roaster', 'Event venue']],
  ['Fitness & beauty', ['Gym', 'Yoga studio', 'Martial arts', 'Salon', 'Barbershop', 'Tattoo studio']]
];

function renderLeadSuggestions() {
  const el = document.getElementById('lead-suggestions');
  if (!el) return;
  el.innerHTML = INDUSTRY_GROUPS.map(([label, items]) => `
    <div class="lead-group">
      <div class="lead-group-label">${label}</div>
      <div class="chip-row">
        ${items.map(name => `<button class="chip" onclick="pickIndustry('${name.replace(/'/g, "\\'")}')">${name}</button>`).join('')}
      </div>
    </div>`).join('');
}

// Tap a chip: fill the industry, then search if an area is set, else focus area
function pickIndustry(name) {
  document.getElementById('lead-industry').value = name;
  const area = document.getElementById('lead-area').value.trim();
  if (area) findLeads();
  else document.getElementById('lead-area').focus();
}

// Remember the last few searches (localStorage) so Rob can repeat them in one tap
function saveRecentSearch(industry, area) {
  try {
    let recent = JSON.parse(localStorage.getItem('css_recent_leads') || '[]');
    recent = recent.filter(r => !(r.industry === industry && r.area === area));
    recent.unshift({ industry, area });
    localStorage.setItem('css_recent_leads', JSON.stringify(recent.slice(0, 5)));
    renderRecentSearches();
  } catch (e) {}
}

function renderRecentSearches() {
  const el = document.getElementById('lead-recent');
  if (!el) return;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('css_recent_leads') || '[]'); } catch (e) {}
  if (!recent.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="lead-group-label">Recent searches</div>
    <div class="chip-row">
      ${recent.map((r, i) => `<button class="chip" onclick="rerunSearch(${i})">${escapeHtml([r.industry, r.area].filter(Boolean).join(' · '))}</button>`).join('')}
    </div>`;
}

function rerunSearch(i) {
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('css_recent_leads') || '[]'); } catch (e) {}
  const r = recent[i];
  if (!r) return;
  document.getElementById('lead-industry').value = r.industry || '';
  document.getElementById('lead-area').value = r.area || '';
  findLeads();
}

document.addEventListener('DOMContentLoaded', renderLeadSuggestions);
document.addEventListener('DOMContentLoaded', renderRecentSearches);

async function findLeads() {
  const industry = document.getElementById('lead-industry').value.trim();
  const area = document.getElementById('lead-area').value.trim();
  const errEl = document.getElementById('lead-error');
  const btn = document.getElementById('lead-search-btn');
  const results = document.getElementById('lead-results');

  errEl.style.display = 'none';
  if (!industry && !area) {
    errEl.textContent = 'Enter an industry and/or an area to search.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Searching...';
  results.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">Searching Google...</p>';

  try {
    const res = await fetch(`${API_URL}/api/find-leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, area })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      errEl.textContent = e.error || 'Search failed. Try again.';
      errEl.style.display = 'block';
      results.innerHTML = '';
      return;
    }
    const data = await res.json();
    lastLeads = data.results || [];
    renderLeads(lastLeads);
    saveRecentSearch(industry, area);
  } catch (e) {
    errEl.textContent = 'Could not reach the server. Try again.';
    errEl.style.display = 'block';
    results.innerHTML = '';
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

function renderLeads(list) {
  const results = document.getElementById('lead-results');
  if (!list.length) {
    results.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0;">No results. Try a different area or industry.</p>';
    return;
  }
  results.innerHTML = list.map((b, i) => {
    const rating = b.rating
      ? `<span class="lead-rating">★ ${b.rating} (${b.reviews})</span>`
      : '<span class="lead-rating">no Google rating</span>';
    const site = b.website
      ? `<a href="${escapeHtml(b.website)}" target="_blank" rel="noopener">website</a>`
      : '<span style="color:var(--amber-text);">no website</span>';
    return `
      <div class="lead-result">
        <div class="lead-result-main">
          <div class="row-name">${escapeHtml(b.name)} ${rating}</div>
          <div class="row-sub">${escapeHtml(b.address)}</div>
          <div class="row-sub">${b.phone ? escapeHtml(b.phone) + ' · ' : ''}${site}</div>
        </div>
        <div class="lead-result-actions">
          ${b.website ? `<button class="icon-btn" onclick="auditLead(${i})"><i class="ti ti-clipboard-check"></i> Audit</button>` : ''}
          <button class="icon-btn" onclick="addLeadAsClient(${i}, this)"><i class="ti ti-user-plus"></i> Add as lead</button>
        </div>
      </div>`;
  }).join('');
}

// Send a result to the Audit tab and run it
function auditLead(i) {
  const b = lastLeads[i];
  if (!b) return;
  document.getElementById('audit-name').value = b.name || '';
  document.getElementById('audit-url').value = b.website || '';
  switchTab('audit');
  if (b.website && typeof runAudit === 'function') runAudit();
}

// Create a client (status lead) from a result
async function addLeadAsClient(i, btn) {
  const b = lastLeads[i];
  if (!b) return;
  const industry = document.getElementById('lead-industry').value.trim();
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = 'Adding...';
  try {
    const res = await fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business: b.name,
        type: industry || null,
        contact: b.phone || null,
        notes: [b.address, b.website].filter(Boolean).join(' · ') || null,
        status: 'lead'
      })
    });
    if (res.ok) {
      btn.innerHTML = '<i class="ti ti-check"></i> Added';
      if (typeof loadClients === 'function') loadClients();
    } else {
      btn.innerHTML = 'Failed';
      btn.disabled = false;
    }
  } catch (e) {
    btn.innerHTML = 'Failed';
    btn.disabled = false;
  }
}
