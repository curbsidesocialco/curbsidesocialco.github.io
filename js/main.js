// Curbside Social Co. public site.
// Everything media-related degrades gracefully: the hero and work frames start
// in their placeholder state and only switch on when a video actually loads,
// so the site looks intentional before Rob drops the files into assets/.

// ---- Nav: scroll tint ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 60
    ? 'rgba(10,10,8,0.97)'
    : 'linear-gradient(to bottom, rgba(10,10,8,0.95), transparent)';
});

// ---- Nav: mobile burger ----
const burger = document.getElementById('nav-burger');
const panel = document.getElementById('nav-panel');
function closePanel() {
  burger.classList.remove('open');
  panel.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
}
burger.addEventListener('click', () => {
  const open = !panel.classList.contains('open');
  burger.classList.toggle('open', open);
  panel.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});
panel.querySelectorAll('a').forEach(a => a.addEventListener('click', closePanel));

// ---- Hero video: switch on only when it can actually play ----
const hero = document.getElementById('hero');
const heroVideo = hero.querySelector('.hero-video');
heroVideo.addEventListener('canplay', () => {
  hero.classList.remove('no-video');
  heroVideo.play().catch(() => {});
});

// ---- Work frames: light up per-video when the file exists ----
document.querySelectorAll('.work-frame').forEach(frame => {
  const video = frame.querySelector('video');
  if (!video) return;
  video.addEventListener('canplay', () => frame.classList.add('has-video'));
});

// Play work videos only while on screen (saves battery, feels alive)
const workObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const frame = entry.target;
    const video = frame.querySelector('video');
    if (!video || !frame.classList.contains('has-video')) return;
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  });
}, { threshold: 0.35 });
document.querySelectorAll('.work-frame').forEach(f => workObserver.observe(f));

// ---- Trusted-by strip: show only if at least one logo file exists ----
const trusted = document.getElementById('trusted');
if (trusted) {
  trusted.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', () => { trusted.hidden = false; });
    img.addEventListener('error', () => { img.remove(); });
  });
}

// ---- Scroll reveal ----
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
