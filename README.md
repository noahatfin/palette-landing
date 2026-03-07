# Palette Landing

Waitlist landing page for **Palette** — an AI-powered platform for creating short dramas and comics. Static HTML/CSS/JS, no build step, deployed on Vercel.

**Production:** https://palette-landing-six.vercel.app
**Repo:** https://github.com/noahatfin/palette-landing

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Architecture](#architecture)
- [Sections](#sections)
- [Animation Systems](#animation-systems)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Markup | Vanilla HTML5 |
| Styling | Vanilla CSS (custom properties, no preprocessor) |
| Scripting | Vanilla JS (ES5-compatible, IIFE modules) |
| Fonts | Google Fonts — Braah One, DM Sans, Playfair Display |
| Animations | Web Animations API + `requestAnimationFrame` |
| Hosting | Vercel (static, no build step) |
| Deployment | Vercel CLI (manual — GitHub auto-deploy is disabled) |

No npm, no bundler, no framework. Every file is served as-is.

---

## Project Structure

```
palette-landing/
├── index.html              # Single-page app — all 4 sections
├── vercel.json             # Vercel config (cache headers, no build)
├── css/
│   ├── styles.css          # Design tokens, global layout, nav, fp-indicator
│   ├── animations.css      # Ticker marquee keyframe
│   └── pages/
│       ├── home.css        # Ticker, shapes, hero, hero-video
│       ├── features.css    # App mockup, feature cards
│       ├── waitlist.css    # Email form, success state
│       └── contact.css     # Two-column contact layout
├── js/
│   ├── main.js             # Spring engine, shapes, fullpage scroll, reveal
│   └── nav.js              # Nav active state, mobile menu toggle
└── imgs/
    ├── hero-bg.png         # Blurred background image
    ├── shape-1.png         # Draggable floating shape
    ├── shape-2.png
    ├── shape-3.png
    ├── shape-4.png
    ├── shape-5.png
    ├── shape-6.png
    └── favicon.png
```

---

## Local Development

No install step needed.

```bash
# Clone
git clone https://github.com/noahatfin/palette-landing.git
cd palette-landing

# Serve (any static server works)
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

Alternatively with Node:

```bash
npx serve .
# or
npx http-server -p 8080
```

**Active development branch is `staging`.** Switch to it before making changes:

```bash
git checkout staging
```

---

## Architecture

### Single-Page Layout

`index.html` contains four `<section id="...">` elements stacked vertically, each `height: 100vh`. JavaScript intercepts scroll events and animates between sections with `easeOutExpo` — no native browser scroll occurs between sections.

```
┌─────────────────────────┐  ← window.scrollY = 0
│  #home   (100vh)        │
├─────────────────────────┤  ← window.scrollY = 1× vh
│  #features  (100vh)     │
├─────────────────────────┤  ← window.scrollY = 2× vh
│  #waitlist  (100vh)     │
├─────────────────────────┤  ← window.scrollY = 3× vh
│  #contact   (100vh)     │
└─────────────────────────┘
```

### CSS Architecture

All design tokens live in `:root` inside `css/styles.css`:

```css
--bg, --ink, --ink-secondary, --ink-tertiary
--surface, --border, --border-ink
--grad-iris, --grad-iris-text
--radius-sm/md/lg/pill
--font-display, --font-body, --font-logo
--ease-out, --ease-in-out
```

Page-specific styles are split into `css/pages/*.css` and loaded in `<head>` order. No CSS-in-JS, no utility classes beyond a few shared helpers (`.glass-card`, `.grad-text`, `.section-label`).

### JavaScript Architecture

Both JS files are IIFEs (`(function() { ... })()`) for scope isolation:

- **`main.js`** — handles all animation and interaction (see [Animation Systems](#animation-systems))
- **`nav.js`** — handles nav active-link highlighting via `IntersectionObserver` and mobile menu toggle

`main.js` exposes nothing to the global scope. It calls `init()` on `DOMContentLoaded` which chains:

```
initAnimations()      → hide hero before animation
setupObserver()       → animate hero on load
setupForm()           → basic form submit handler
setupDraggableShapes() → drag + spring-back on .shape elements
setupFullpageScroll()  → intercept wheel/touch, easeOutExpo between sections
setupScrollReveal()    → IntersectionObserver spring-reveal on [data-reveal]
```

---

## Sections

| Section | ID | Key Classes |
|---------|----|-------------|
| Hero | `#home` | `.hero`, `.hero-video`, `.hero-actions` |
| Features | `#features` | `.features-intro`, `.mockup-wrapper`, `.features-grid` |
| Waitlist | `#waitlist` | `.waitlist-main`, `.waitlist-form`, `.waitlist-success` |
| Contact | `#contact` | `.contact-main`, `.contact-left`, `.contact-right` |

### Fullpage Scroll Indicator

A `div.fp-indicator` is injected into `<body>` by `setupFullpageScroll()` at runtime. It contains one `.fp-dot-wrapper > .fp-dot + .fp-dot-label` per section. Clicking a dot calls `goTo(idx)`. The active dot plays a `fp-dot-pop` bounce keyframe; hovering shows the section name tooltip.

---

## Animation Systems

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full technical deep-dive. Summary:

| System | File | Technique |
|--------|------|-----------|
| Hero appear | `main.js` → `setupObserver()` | WAAPI with spring `linear()` easing |
| Draggable shapes | `main.js` → `setupDraggableShapes()` | rAF spring physics (stiffness=300, damping=25) |
| Fullpage scroll | `main.js` → `setupFullpageScroll()` | rAF `easeOutExpo`, 480–620ms |
| Scroll reveal | `main.js` → `setupScrollReveal()` | WAAPI `cubic-bezier(0.34, 1.56, 0.64, 1)`, staggered 120ms |
| Ticker marquee | `css/animations.css` | CSS `@keyframes ticker-scroll`, 40s linear infinite |
| Nav active | `js/nav.js` | `IntersectionObserver` at threshold 0.35 |

---

## Deployment

GitHub push does **not** auto-deploy (disabled in `vercel.json`). All deployments are manual via the Vercel CLI.

### Install Vercel CLI

```bash
npm i -g vercel
vercel login
```

### Daily workflow

```bash
# Work on staging
git checkout staging

# Preview deploy (generates a unique preview URL)
vercel

# Commit and push to GitHub
git add .
git commit -m "your message"
git push origin staging
```

### Deploy to production

```bash
git checkout main
git merge staging
git push origin main
vercel --prod
```

### Cache headers (from `vercel.json`)

| Path | Cache-Control |
|------|---------------|
| `/imgs/*` | `public, max-age=31536000, immutable` (1 year) |
| `/css/*` | `public, no-cache` |
| `/js/*` | `public, no-cache` |

Images are fingerprinted by filename — safe to cache forever. CSS/JS are served fresh every request.

---

## Troubleshooting

### Page doesn't scroll between sections

The fullpage scroll requires `section[id]` elements as direct children of `.page`. Check that:
1. All four sections have an `id` attribute.
2. JavaScript loaded without errors (open DevTools console).

### Shapes are invisible on mobile

Intentional — shapes are hidden on screens under 810px via `@media (max-width: 809.98px) { .shape { display: none; } }` in `home.css`.

### Dots indicator doesn't appear

`setupFullpageScroll()` appends `.fp-indicator` to `<body>` at runtime. If it's missing, check that `main.js` loaded and `section[id]` elements exist in the DOM.

### Hero animation doesn't play

The WAAPI hero animation requires `Element.prototype.animate` (supported in all modern browsers). On failure, `main.js` falls back to showing the element immediately (no crash).

### Scroll reveal doesn't trigger

Elements need a `data-reveal="N"` attribute (where N is the stagger index, starting at 0) inside a `section[id]` parent. `IntersectionObserver` fires at `threshold: 0.1`.

### Vercel deploy fails

```bash
# Re-link project
vercel link

# Then deploy
vercel --prod
```

Make sure you're authenticated: `vercel whoami`.
