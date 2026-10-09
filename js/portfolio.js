// Portfolio page players. Uses streamUrl / streamThumb / playStream from site.js.
// - Every .pf-media slot shows a still until it's tapped, then plays with sound.
// - Only one video plays at a time; starting one pauses the rest.
// - Landscape players (reel, films) hand over to native controls once playing
//   (scrub, fullscreen). Vertical reels stay tap-to-pause with a sound toggle.
// - A slot with no stream and no working MP4 removes itself, and a section with
//   no slots left hides, so the live page never shows empty boxes.
//   Add ?preview to the URL to see the empty slots as labeled placeholders.

const preview = new URLSearchParams(location.search).has('preview');
const slots = [...document.querySelectorAll('.pf-media')];
let current = null;

slots.forEach(slot => {
  const video = slot.querySelector('video');
  const id = slot.dataset.stream;
  const mp4 = slot.dataset.src;
  video.playsInline = true;
  video.setAttribute('webkit-playsinline', '');

  const poster = slot.dataset.poster || streamThumb(id, slot.classList.contains('pf-vertical') ? 960 : 1080);
  if (poster) video.poster = poster;

  if (!id) {
    // No stream: the MP4 has to prove it exists before the slot is shown
    if (!mp4) return emptySlot(slot);
    video.preload = 'metadata';
    video.src = mp4;
    video.addEventListener('error', () => emptySlot(slot), { once: true });
    video.addEventListener('loadedmetadata', () => slot.classList.add('is-ready'), { once: true });
  } else {
    slot.classList.add('is-ready');
  }

  video.addEventListener('play', () => slot.classList.add('is-playing'));
  video.addEventListener('pause', () => slot.classList.remove('is-playing'));
  video.addEventListener('volumechange', () => updateMute(slot));
  // A tap can land before the stream is attached; start as soon as it can
  video.addEventListener('canplay', () => {
    if (slot.dataset.wantPlay) { delete slot.dataset.wantPlay; start(slot); }
  });

  slot.querySelector('.pf-play').addEventListener('click', () => toggle(slot));
  if (slot.classList.contains('pf-vertical')) {
    video.addEventListener('click', () => toggle(slot));
    const mute = slot.querySelector('.pf-mute');
    if (mute) mute.addEventListener('click', e => { e.stopPropagation(); video.muted = !video.muted; });
  }
});

// Attach streams shortly before they scroll into view, so a tap plays right away
const nearView = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    nearView.unobserve(entry.target);
    attach(entry.target);
  });
}, { rootMargin: '300px 0px' });
slots.forEach(slot => { if (slot.dataset.stream) nearView.observe(slot); });

function attach(slot) {
  if (slot.dataset.attached) return;
  slot.dataset.attached = '1';
  const video = slot.querySelector('video');
  const mp4 = slot.dataset.src;
  playStream(video, streamUrl(slot.dataset.stream), () => {
    if (mp4) { video.src = mp4; video.load(); } else emptySlot(slot);
  });
}

function toggle(slot) {
  const video = slot.querySelector('video');
  if (!video.paused) return video.pause();
  attach(slot);
  if (video.readyState < 2) slot.dataset.wantPlay = '1';
  start(slot);
}

function start(slot) {
  const video = slot.querySelector('video');
  if (current && current !== slot) current.querySelector('video').pause();
  current = slot;
  if (slot.classList.contains('pf-landscape')) video.controls = true;
  video.muted = false;
  // Some browsers refuse sound without a fresh tap; play muted rather than not at all
  video.play().catch(err => {
    if (err.name === 'NotAllowedError') { video.muted = true; video.play().catch(() => {}); }
  });
}

function updateMute(slot) {
  const btn = slot.querySelector('.pf-mute');
  if (!btn) return;
  const muted = slot.querySelector('video').muted;
  btn.textContent = muted ? 'Sound off' : 'Sound on';
  btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
}

function emptySlot(slot) {
  if (preview) {
    slot.classList.add('is-empty');
    slot.insertAdjacentHTML('beforeend',
      `<div class="pf-placeholder"><span class="work-mono">CS</span><em>${slot.dataset.label || 'Video'}</em>` +
      `<small>${slot.dataset.src || 'add a Stream id'}</small></div>`);
    return;
  }
  const holder = slot.closest('.pf-film') || slot;
  const section = slot.closest('.pf-section');
  holder.remove();
  if (section && !section.querySelector('.pf-media')) {
    section.hidden = true;
    document.querySelectorAll(`a[href$="#${section.id}"]`).forEach(a => { a.hidden = true; });
  }
}
