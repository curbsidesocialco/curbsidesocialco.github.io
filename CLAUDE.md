# Curbside Social Co. — Project Context

This file is the shared memory for this project. Any AI session (Claude Code,
Claude chat, etc.) should read this first to understand the business, the
stack, the decisions already made, and what's planned next.

Last updated: June 2026

---

## The person

Rob Galvan. Runs Curbside Social Co., a San Antonio video production and
digital marketing business (operating since 2022). Shoots video on a Sony FX3,
photos on a Sony A7IV. Food content, weddings, events, and branded reels for
local businesses. Former web developer, comfortable learning fast. Prefers to
understand things, not just paste them.

Brand handles:
- @cssocialtx — agency / business account (this is the business identity)
- @reeltxeats — personal food/lifestyle page (NOT part of the business tooling)

Contact: robgalvan@gmail.com / 210.883.7567 / linkedin.com/in/rob-galvan

### Writing / voice rules (important)
- NEVER use em dashes (—) or double hyphens (--) in anything written for Rob.
- Outreach to businesses: not all-lowercase, pricing stated upfront, no buzzwords,
  no AI-sounding phrasing, short direct sentences, sound like a real local person.
- Audit tool framing: WINS AND FIXES, never fear. No made-up "you're losing $X/month"
  figures. No fake urgency. No SMS-marketing funnels. Green "looks good" + amber
  "easy win", never red scare-screens.

---

## What the business sells (these are what every tool should point back to)

Video:
- Social package: $150 for 3 reels (1 collab reel on his page, business keeps 2),
  shot on a high-quality mobile setup. Good for a dish, product, or event.
- Cinematic package: $500+, shot on the Sony FX3. High-end brand film for upscale spots.

Web:
- Landing Page $500
- Brochure Site $1,200
- Managed Site $1,200 + $150/month
- Custom Web App: custom quote

Rule of thumb: every dashboard feature should end with a finger pointing at one of
these services (a reel, a shoot, a site refresh, a content retainer). If a feature
doesn't lead back to something Rob sells, it's decoration.

---

## The stack

- Code/repo: GitHub, org `curbsidesocialco`, repo `curbsidesocialco.github.io`
  (named this way so GitHub Pages historically served it; now also on Vercel).
  GitHub user is `robglvn`.
- Hosting (frontend): Vercel, Hobby plan, connected to the GitHub repo, auto-deploys on push.
- Domain: curbsidesocial.co, registered on Cloudflare, pointed at Vercel (apex + www live).
- Backend: Railway, a Node.js + Express service named `api`.
  Public URL: https://api-production-eab8a.up.railway.app
- Database: Railway Postgres, linked to the api service via DATABASE_URL
  (set as a Railway reference variable: ${{Postgres.DATABASE_URL}}).
- Secrets (Railway env vars): ANTHROPIC_API_KEY (used by the backend for message generation),
  DATABASE_URL. Never hardcode keys in the repo.
- Local workflow: edit in VS Code -> commit/push via GitHub Desktop or terminal git ->
  Vercel auto-deploys frontend, Railway auto-deploys backend.

### Repo structure
```
curbsidesocialco.github.io/
├── index.html              public marketing homepage (curbsidesocial.co)
├── css/main.css            public site styles
├── js/main.js              public site scripts
├── assets/
├── server.js               Railway backend (Express API)
├── package.json            backend deps (express, cors, pg)
├── vercel.json             rewrites so /dashboard serves correctly
└── dashboard/              the private admin tool (curbsidesocial.co/dashboard)
    ├── index.html
    ├── css/ (main.css, components.css)
    ├── js/ (tabs.js, outreach.js, projects.js, pin.js)
    └── assets/
```
Note: dashboard asset paths are absolute (/dashboard/...) so they work on Vercel.

### Brand / design tokens
- Colors: black #0a0a08, cream #e8e0d0, gold #b8974a.
- Fonts: UnifrakturMaguntia (old-english display), Cormorant Garamond (serif),
  DM Sans (body). Old-english "CS" monogram is the logo motif.
- Dashboard is its own cleaner black/cream UI; public site is more editorial.

### Dashboard access
- PIN-gated via dashboard/js/pin.js. PIN: 478133. Stored in localStorage key `css_auth`.
  (This is light protection for a personal tool, not real auth.)

---

## What's already built and working

1. Public marketing site at curbsidesocial.co — hero, services, the two video
   packages, the four web pricing tiers, about, contact. Footer links to /dashboard.
2. PIN-protected dashboard with tabs: Overview, Outreach, Leads, Projects, Content, Clients.
3. Outreach generator (Outreach tab): form (business, type, area, hook, relationship,
   offer type, price, platform) -> calls backend /api/outreach -> Claude (haiku) writes
   a first message + a follow-up, adapted to relationship (new lead / contacted / past
   client / active client) and offer type. No price hardcoding; can also generate with
   no offer ("just open a conversation").
4. Live outreach log backed by Postgres. Endpoints on the backend:
   - POST /api/outreach  (generate messages)
   - POST /api/log       (save an outreach entry)
   - GET  /api/log       (list entries)
   - PATCH /api/log/:id  (update status: sent/followup/replied/booked/declined)
   - DELETE /api/log/:id
   The `outreach` table has: id, business, type, area, relationship, offer, price,
   platform, status, pitch, followup, created_at.

---

## Decisions already made (don't relitigate without reason)

- Use the backend (Railway) for all AI + secret-key calls. The browser never holds
  the Anthropic key anymore. (Earlier prototypes used localStorage for the key;
  that's been replaced.)
- Outreach tone adapts to relationship; past/active clients get NO cold intro and
  NO cold price pitch.
- Studied Owner.com and GoHighLevel audit tools. Deliberately REJECTED: fake dollar-loss
  figures, fear/urgency framing, SMS-marketing opt-in funnels, competitor "you're losing
  to them" comparisons, and the local-rank map grid (expensive + fear-based).
- Audit tool will be a private in-meeting / leave-behind tool, NOT a public lead-capture
  funnel with a phone gate.

---

## Roadmap (next build: the Client Audit tab + real Client records)

### A. Client Audit tab (scoped, agreed)
A new dashboard tab. Type a business name + website URL, hit Run audit, get:
- A Google rating scorecard: rating, review count, recent-review recency.
  (Needs a Google Places API key — Google Cloud project + billing; large free tier,
  Rob's volume will likely be $0. Same Cloud setup needed later for the Gmail agent.)
- A website check (FREE, runs server-side on the Railway backend by fetching the URL
  and parsing HTML — browsers can't do this cross-origin, so it must be a backend
  endpoint, e.g. POST /api/audit). Checks, framed as wins/easy-fixes:
  - mobile-friendly viewport
  - visible phone number
  - Open Graph / link-preview image
  - image alt text
  - social media links
  - meta description, H1, favicon
- Three summary cards: Google rating, site health (X/9 + count of easy wins),
  and an "opportunity" cell naming what Rob would pitch (e.g. "content + site refresh").
- Each easy win should carry a short "what I'd do about it" line in Rob's voice that
  points at a reel/shoot/site service.
- DECIDED to SKIP for now: page-speed/Core-Web-Vitals, mobile-perf scoring, and the
  local-rank map. (SEO could become its own tab much later.)
- Possible later add: save your shot/work next to a finding (before/after using Rob's
  real footage, e.g. the Tandem reel) to make the gap-to-service link visual.

### B. Turn Clients into real linked records (the bigger build)
Make `client` the central object. New `clients` table (business, type, area, contact,
status). Then audits + outreach + projects each carry a `client_id` foreign key pointing
back to the client. Opening a client shows everything done with them: every pitch, every
saved audit, every project, in one place. This converts the current static Clients tab
into a real lightweight CRM.

This is a multi-table, multi-file build (database + backend + dashboard at once). It's
the reason Rob is moving to Claude Code — connected changes across files are painful to
do one-file-at-a-time in chat.

### C. Later / further out
- Gmail API wired to the backend so outreach can actually send from a business Gmail
  (curbsidesocial@gmail.com), and log + schedule follow-ups. (Google Cloud setup shared
  with the Places API work.)
- Eventually a more autonomous outreach agent (find leads, send, monitor replies,
  follow up). Build incrementally; don't over-engineer ahead of need.

---

## Working style with Rob
- Explain the "why", not just the "what" — he's learning and retains it.
- Keep his wellbeing in mind; he's rebuilding and works late. Big/connected tasks are
  better fresh than exhausted. It's fine to suggest stopping at a good checkpoint.
- Honesty over hype: if a feature is a lot of work for little payoff, or drifts toward
  the scare-tactic playbook he rejected, say so.
