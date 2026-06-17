const TABS = ['overview','outreach','leads','audit','projects','calendar','clients'];
const DEFAULT_TAB = 'overview';

function getActiveTab() {
  const hash = window.location.hash.replace('#', '');
  return TABS.includes(hash) ? hash : DEFAULT_TAB;
}

function switchTab(name) {
  if (!TABS.includes(name)) name = DEFAULT_TAB;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'tab-' + name);
  });
  if (window.location.hash !== '#' + name) {
    history.pushState(null, '', '#' + name);
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

window.addEventListener('popstate', () => switchTab(getActiveTab()));
switchTab(getActiveTab());
