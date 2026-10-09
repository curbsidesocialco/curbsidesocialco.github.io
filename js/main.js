// Curbside Social Co. public site.
// Everything media-related degrades gracefully: the hero and work frames start
// in their placeholder state and only switch on when a video actually loads,
// so the site looks intentional before Rob drops the files into assets/.

// Nav and the Cloudflare Stream helpers (streamUrl, playStream) live in
// js/site.js, which loads first.

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
// - With a Cloudflare Stream id, the stream goes first and the MP4s are backups.
const heroSources = [streamUrl(heroVideo.dataset.stream)].concat(
  window.matchMedia('(max-width: 900px)').matches
    ? [heroVideo.dataset.srcMobile, heroVideo.dataset.src]
    : [heroVideo.dataset.src, heroVideo.dataset.srcMobile]
).filter(Boolean);
let heroSourceIndex = 0;

function playHero() { heroVideo.muted = true; heroVideo.play().catch(() => {}); }

// Move to the next source, once per failure (a stream can report the same
// failure twice: once from hls.js and once from the video element).
function heroFailed(index) {
  if (index !== heroSourceIndex) return;
  heroSourceIndex++;
  loadHeroSource();
}

function loadHeroSource() {
  const src = heroSources[heroSourceIndex];
  if (!src) { hero.classList.add('no-video'); return; }
  const index = heroSourceIndex;
  if (src.endsWith('.m3u8')) {
    playStream(heroVideo, src, () => heroFailed(index));
  } else {
    heroVideo.src = src;
    heroVideo.load();
  }
  playHero();
}

heroVideo.addEventListener('error', () => heroFailed(heroSourceIndex));
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
  // If the clip is already on screen when it becomes playable (a stream can
  // attach a moment after the page loads), start it then.
  video.addEventListener('canplay', () => {
    if (frame.dataset.inView) video.play().then(() => frame.classList.add('has-video')).catch(() => {});
  });
  // Stream it when a Cloudflare Stream id is set; the MP4 is the backup
  const url = streamUrl(video.dataset.stream);
  const source = video.querySelector('source');
  if (url && source) {
    const mp4 = source.src;
    source.remove();
    playStream(video, url, () => { video.src = mp4; video.load(); });
  }
});

const workObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const frame = entry.target;
    const video = frame.querySelector('video');
    if (!video) return;
    frame.dataset.inView = entry.isIntersecting ? '1' : '';
    if (entry.isIntersecting) {
      video.play().then(() => frame.classList.add('has-video')).catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.25 });
document.querySelectorAll('.work-frame').forEach(f => workObserver.observe(f));

// ---- Trusted-by strip: show only if at least one logo file exists, then loop it ----
const trusted = document.getElementById('trusted');
if (trusted) {
  const track = trusted.querySelector('.trusted-logos');
  const imgs = [...track.querySelectorAll('img')];
  // Wait until every slot has either loaded or 404'd, so we know the real set
  Promise.all(imgs.map(img => img.complete
    ? Promise.resolve()
    : new Promise(done => { img.addEventListener('load', done); img.addEventListener('error', done); })
  )).then(() => {
    imgs.forEach(img => { if (!img.naturalWidth) img.remove(); });
    const logos = [...track.querySelectorAll('img')];
    if (!logos.length) return;
    trusted.hidden = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!track.scrollWidth) return; // strip not rendered, nothing to measure

    // Repeat the set until one copy is wider than any screen (so no gap shows
    // even when the window is resized), then double it for the -50% loop
    const minWidth = Math.max(window.screen.width, window.innerWidth);
    let guard = 0;
    while (track.scrollWidth < minWidth && guard++ < 20) {
      logos.forEach(img => track.appendChild(img.cloneNode()));
    }
    [...track.children].forEach(img => {
      const copy = img.cloneNode();
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    });
    // Constant speed (about 40px per second) no matter how many logos there are
    track.style.setProperty('--trusted-duration', `${Math.round(track.scrollWidth / 2 / 40)}s`);
    track.classList.add('is-moving');
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
