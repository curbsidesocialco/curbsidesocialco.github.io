// Curbside Social Co. shared site script: nav + Cloudflare Stream helpers.
// Loaded on every public page before that page's own script (main.js on the
// homepage, portfolio.js on /portfolio), which use streamUrl/playStream below.

// ---- Nav: scroll tint ----
const nav = document.getElementById('nav');
// The glass gets a little more solid once you scroll past the hero
const tintNav = () => nav.classList.toggle('scrolled', window.scrollY > 60);
window.addEventListener('scroll', tintNav, { passive: true });
tintNav();

// ---- Cards: soft spotlight that follows the cursor (CSS reads --mx/--my) ----
if (window.matchMedia('(hover: hover)').matches) {
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('.result-card, .shoot-card, .service-item, .offer-card, .video-pkg, .web-tier, .money-card, .tier, .truth');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

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

// ---- Nav: Portfolio dropdown ----
// Opens on hover (CSS) and keyboard focus (CSS :focus-within). A tap on touch
// screens has no hover, so the first tap opens the menu instead of navigating.
document.querySelectorAll('.nav-drop').forEach(drop => {
  const toggle = drop.querySelector('.nav-drop-toggle');
  toggle.addEventListener('click', e => {
    if (window.matchMedia('(hover: none)').matches && !drop.classList.contains('open')) {
      e.preventDefault();
      drop.classList.add('open');
    }
  });
  document.addEventListener('click', e => { if (!drop.contains(e.target)) drop.classList.remove('open'); });
});

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

// A still frame Cloudflare generates for any uploaded video (used as posters)
function streamThumb(id, height) {
  return STREAM_CUSTOMER && id
    ? `https://${STREAM_CUSTOMER}.cloudflarestream.com/${id}/thumbnails/thumbnail.jpg?time=1s&height=${height}`
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
