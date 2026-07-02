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

## Trusted-by logos (strip stays hidden until at least one exists)
- `logos/logo-1.png` … `logos/logo-6.png`
  Client logos, transparent PNG (or SVG, rename accordingly in index.html),
  roughly 240px wide. They render monochrome cream automatically; any color
  logo is fine.

## Link preview
- `og.jpg`: the image shown when the site is shared/texted.
  1200x630 JPG, under 400 KB. A strong still from a shoot with the CS mark
  works great.
