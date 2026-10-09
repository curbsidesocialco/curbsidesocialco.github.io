# Media drop-ins for curbsidesocial.co

The site is built to receive these files. Drop them in with these exact names,
commit, push, and they go live. Nothing else to change; the site detects each
file and switches it on automatically. Until a file exists, its section shows a
branded placeholder (or stays hidden).

## Hero
- `hero.mp4`: the homepage background film.
  Landscape 1920x1080, 15 to 30 seconds, muted-friendly (no important audio),
  compressed hard (target under 15 MB; export H.264, ~5 Mbps).
- `hero-poster.jpg`: first-frame still shown while the video loads.
  1920x1080 JPG, under 300 KB.

## Recent Work (4 frames)
- `work-1.mp4`, `work-2.mp4`, `work-3.mp4`, `work-4.mp4`
  Vertical 9:16 (1080x1920), 10 to 15 seconds each, muted-friendly,
  compressed (target under 8 MB each).
  Captions live in `index.html` (search for `work-caption`). Edit the four
  labels to match each clip (e.g. "Battalion · Brand film").

## Portfolio page (/portfolio)
Slots live in `portfolio.html`. Each is a `<figure class="pf-media">` with a
`data-stream` (Cloudflare Stream Video ID, preferred) and/or `data-src` (MP4).
Empty slots and empty sections hide themselves on the live page. To see every
empty slot as a labeled placeholder, open `curbsidesocial.co/portfolio?preview`.
- Sizzle reel: 16:9, 45 to 90 seconds, WITH sound. Right now it borrows the hero
  cut. Upload the real one to Stream, paste its ID into the `#reel` slot, and
  delete that slot's `data-poster` line.
- Films (2): 16:9 full edits with sound. Upload to Stream and paste each ID into
  `data-stream` (big files don't belong in git). Edit the client name and tags
  under each one.
- Reels (8): 9:16 verticals with sound. Slots 1 to 4 reuse the homepage work
  clips. Slots 5 to 8 take a Stream ID or `assets/portfolio/reel-5.mp4` etc.
  Edit the caption on each.

## Brand logos (scrolling strip under the hero; hidden until at least one exists)
- `logos/logo-1.png` … `logos/logo-8.png`
  Client logos, roughly 400px wide. Use any number up to 8; empty slots are
  skipped. The strip loops them automatically and turns every logo solid white,
  so any color logo is fine.
  The background MUST be transparent. A logo on a white or colored box turns
  into a solid white rectangle. If a client only has a JPG, remove the
  background first (remove.bg or Photoshop) and export as PNG.
  Crop tight to the logo with no extra padding so they all look the same size.
  For SVG logos, change the matching `.png` to `.svg` in index.html.

## Link preview
- `og.jpg`: the image shown when the site is shared/texted.
  1200x630 JPG, under 400 KB. A strong still from a shoot with the CS mark
  works great.
