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
// iOS in-app browsers (Instagram, Facebook) only autoplay a muted video when
// muted is set as a property in JS, not just as the attribute -- the same line
// that makes the work reels play. Set it (and inline playback) before load/play.
heroVideo.muted = true;
heroVideo.playsInline = true;
heroVideo.setAttribute('webkit-playsinline', '');
// Bulletproof hero:
// - The poster (a still of the film) shows instantly, so the hero is never empty
//   even if the video is slow, blocked, or never plays.
// - Phones get a lighter 720p file; desktop gets the full 1080p film.
// - iPhone Low Power / Low Data Mode blocks autoplay; we retry play() on the
//   first touch, scroll, or click, and whenever the tab comes back into view.
// - If a file fails, try the other one; if both fail, fall back to the monogram.
const heroSources = window.matchMedia('(max-width: 900px)').matches
  ? [heroVideo.dataset.srcMobile, heroVideo.dataset.src]
  : [heroVideo.dataset.src, heroVideo.dataset.srcMobile];
let heroSourceIndex = 0;

function playHero() { heroVideo.muted = true; heroVideo.play().catch(() => {}); }

function loadHeroSource() {
  const src = heroSources[heroSourceIndex];
  if (!src) { hero.classList.add('no-video'); return; }
  heroVideo.src = src;
  heroVideo.load();
  playHero();
}

heroVideo.addEventListener('error', () => { heroSourceIndex++; loadHeroSource(); });
heroVideo.addEventListener('canplay', playHero);
['touchstart', 'scroll', 'click'].forEach(evt =>
  window.addEventListener(evt, playHero, { once: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) playHero(); });

loadHeroSource();

// ---- Work frames: play in view, reveal once the first frame is ready ----
// Mobile Safari won't load a preload="metadata" video past its metadata until
// play() is called, so canplay never fires and the clip stays hidden. Fix:
// trigger play() when the frame scrolls in (kicks the load on mobile) and reveal
// on loadeddata or a successful play. Genuinely-missing files stay on placeholder.
document.querySelectorAll('.work-frame').forEach(frame => {
  const video = frame.querySelector('video');
  if (!video) return;
  video.muted = true; // iOS needs muted set as a property, not just the attribute
  video.addEventListener('loadeddata', () => frame.classList.add('has-video'));
});

const workObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const frame = entry.target;
    const video = frame.querySelector('video');
    if (!video) return;
    if (entry.isIntersecting) {
      video.play().then(() => frame.classList.add('has-video')).catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.25 });
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
