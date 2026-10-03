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

// ---- Cloudflare Stream (adaptive streaming) ----
// Each video tag carries data-stream="<video id>" from the Cloudflare Stream
// dashboard. With an id set, the video streams: it starts fast at a quality the
// connection can handle and steps up, instead of stalling on one big MP4.
// If streaming fails for any reason, the video falls back to the MP4 in assets/.
// Leave STREAM_CUSTOMER or an id empty and that video just uses the MP4.
const STREAM_CUSTOMER = 'customer-sq5pmgyxyshq79lc'; // from any video's HLS link in Cloudflare Stream
const HLS_JS = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.15/hls.light.min.js';

function streamUrl(id) {
  return STREAM_CUSTOMER && id
    ? `https://${STREAM_CUSTOMER}.cloudflarestream.com/${id}/manifest/video.m3u8`
    : null;
}

// Streams play through hls.js wherever it's supported (desktop browsers, and
// iPhones on iOS 17.1+), because it lets us set a quality floor: start at 480p
// and never drop below it, then climb to full HD as the signal allows. Where
// hls.js isn't supported (older iPhones, some in-app browsers), the browser
// plays the stream natively. hls.js only downloads when a stream is used.
const MIN_QUALITY = 480; // shortest side in pixels: 480p for the hero, 480 wide for vertical reels
const nativeHls = document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
let hlsLoader = null;
function loadHls() {
  if (!hlsLoader) hlsLoader = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = HLS_JS;
    s.onload = () => resolve(window.Hls);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return hlsLoader;
}

// Attach a stream to a video. onFail runs once if it can't play.
function playStream(video, url, onFail) {
  let failed = false;
  const fail = () => { if (!failed) { failed = true; onFail(); } };
  const playNative = () => {
    if (!nativeHls) return fail();
    video.addEventListener('error', fail, { once: true });
    video.src = url;
    video.load();
  };
  loadHls().then(Hls => {
    if (!Hls || !Hls.isSupported()) return playNative();
    const hls = new Hls();
    hls.on(Hls.Events.MANIFEST_PARSED, (evt, data) => {
      // Lowest level that meets the floor (levels are sorted low to high)
      const floor = data.levels.findIndex(l => Math.min(l.width, l.height) >= MIN_QUALITY);
      if (floor > 0) {
        hls.startLevel = floor;
        hls.config.minAutoBitrate = data.levels[floor].bitrate - 1;
      }
    });
    hls.on(Hls.Events.ERROR, (evt, data) => { if (data.fatal) { hls.destroy(); fail(); } });
    hls.loadSource(url);
    hls.attachMedia(video);
  }).catch(playNative);
}

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
