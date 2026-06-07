(function() {
  const CORRECT_PIN = '478133';
  const STORAGE_KEY = 'css_auth';

  function isAuthed() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function showPinScreen() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;padding:0;background:#0a0a08;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;padding:40px;';
    wrap.innerHTML = `
      <div style="font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#b8974a;margin-bottom:48px;">Dashboard Access</div>
      <div id="pin-display" style="font-size:36px;color:#e8e0d0;letter-spacing:0.4em;min-height:50px;margin-bottom:16px;">——————</div>
      <div id="pin-error" style="font-size:13px;color:#e74c3c;min-height:20px;margin-bottom:20px;"></div>
      <div style="display:grid;grid-template-columns:repeat(3,80px);gap:10px;justify-content:center;">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button data-key="${k}" style="width:80px;height:80px;background:#111110;border:1px solid rgba(232,224,208,0.15);color:#e8e0d0;font-size:24px;cursor:pointer;">${k}</button>
        `).join('')}
      </div>
    `;
    document.body.appendChild(wrap);

    let entered = '';

    document.querySelectorAll('button[data-key]').forEach(btn => {
      btn.addEventListener('click', function() {
        const key = this.getAttribute('data-key');
        const display = document.getElementById('pin-display');
        const error = document.getElementById('pin-error');

        if (key === '') return;

        if (key === '⌫') {
          entered = entered.slice(0, -1);
        } else {
          entered += key;
        }

        const filled = '●'.repeat(entered.length);
        const empty = '—'.repeat(6 - entered.length);
        display.textContent = filled + empty;

        error.textContent = '';

        if (entered.length === 6) {
          if (entered === CORRECT_PIN) {
            localStorage.setItem(STORAGE_KEY, 'true');
            location.reload();
          } else {
            error.textContent = 'Incorrect PIN. Try again.';
            entered = '';
            display.textContent = '——————';
          }
        }
      });
    });
  }

  if (!isAuthed()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showPinScreen);
    } else {
      showPinScreen();
    }
  }
})();
