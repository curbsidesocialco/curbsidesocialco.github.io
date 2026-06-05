// PIN protection — runs before anything else
(function() {
  const CORRECT_PIN = '478133';
  const STORAGE_KEY = 'css_auth';

  function isAuthed() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function showPinScreen() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;padding:0;background:#0a0a08;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:DM Sans,sans-serif;';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;padding:40px;';
    wrap.innerHTML = `
      <div style="font-family:UnifrakturMaguntia,cursive;font-size:48px;color:#e8e0d0;margin-bottom:8px;">Curbside Social Co.</div>
      <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#b8974a;margin-bottom:48px;">Dashboard Access</div>
      <div id="pin-display" style="font-family:'DM Mono',monospace;font-size:32px;color:#e8e0d0;letter-spacing:0.3em;min-height:48px;margin-bottom:32px;">——————</div>
      <div id="pin-error" style="font-size:13px;color:#c0392b;min-height:20px;margin-bottom:16px;"></div>
      <div style="display:grid;grid-template-columns:repeat(3,72px);gap:10px;justify-content:center;margin:0 auto;">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button onclick="pinPress('${k}')" style="width:72px;height:72px;background:#111110;border:1px solid rgba(232,224,208,0.12);color:#e8e0d0;font-size:22px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:background 0.15s;border-radius:0;" onmouseover="this.style.background='#1a1a17'" onmouseout="this.style.background='#111110'">${k}</button>
        `).join('')}
      </div>
    `;
    document.body.appendChild(wrap);

    // Load fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }

  let entered = '';

  window.pinPress = function(key) {
    if (key === '') return;
    const display = document.getElementById('pin-display');
    const error = document.getElementById('pin-error');

    if (key === '⌫') {
      entered = entered.slice(0, -1);
    } else {
      entered += key;
    }

    // Show dots
    const dots = entered.split('').map(() => '●').join(' ');
    const blanks = Array(6 - entered.length).fill('—').join(' ');
    display.textContent = (dots + (dots && blanks ? ' ' : '') + blanks) || '— — — — — —';

    if (entered.length === 6) {
      if (entered === CORRECT_PIN) {
        localStorage.setItem(STORAGE_KEY, 'true');
        location.reload();
      } else {
        error.textContent = 'Incorrect PIN. Try again.';
        entered = '';
        display.textContent = '— — — — — —';
      }
    } else {
      error.textContent = '';
    }
  };

  if (!isAuthed()) {
    document.addEventListener('DOMContentLoaded', showPinScreen);
  }
})();


