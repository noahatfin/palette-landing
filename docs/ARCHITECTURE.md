# Architecture — Animation & Interaction Systems

This document covers the technical implementation of every animation and interaction system in `palette-landing`. All code lives in `js/main.js` unless otherwise noted.

---

## Table of Contents

- [Spring Animation Engine (Hero Appear)](#spring-animation-engine-hero-appear)
- [Draggable Shapes with Spring-Back](#draggable-shapes-with-spring-back)
- [Fullpage Scroll (easeOutExpo)](#fullpage-scroll-easeoutexpo)
- [Scroll Reveal](#scroll-reveal)
- [Ticker Marquee](#ticker-marquee)
- [Nav Active State](#nav-active-state)
- [Design Token Reference](#design-token-reference)

---

## Spring Animation Engine (Hero Appear)

**Functions:** `springPosition()`, `getSpringDuration()`, `generateLinearEasing()`, `initAnimations()`, `animateElement()`, `setupObserver()`

The hero section uses an **analytical spring solver** ported from the Framer Motion source. Unlike the rAF-based spring used for shapes (below), this one pre-computes the full spring curve at startup and converts it to a CSS `linear()` easing string, then hands off to the Web Animations API.

### Spring Parameters

```js
const STIFFNESS = 186;  // k — spring constant
const DAMPING   = 30;   // c — damping coefficient
const MASS      = 1;    // m — mass
```

Damping ratio: `ζ = c / (2 * sqrt(k * m)) ≈ 1.10` — slightly overdamped, so the hero fades in with no bounce.

### Analytical Solution

For underdamped springs (ζ < 1):

```
x(t) = 1 - e^(-ζω₀t) * [cos(ωDt) + (ζω₀/ωD) * sin(ωDt)]
```

where `ω₀ = sqrt(k/m)` and `ωD = ω₀ * sqrt(1 - ζ²)`.

At ζ ≥ 1 (critically/overdamped), falls back to: `x(t) = 1 - (1 + ω₀t) * e^(-ω₀t)`

### CSS `linear()` Easing

`generateLinearEasing(30)` samples 30 points along the spring curve and produces a string like:

```css
animation-timing-function: linear(0.0000, 0.0821, 0.2934, 0.5021, ..., 1.0000);
```

This is supported in Chrome 113+, Safari 17+, Firefox 112+. Older browsers fall back to `cubic-bezier(0.16, 1, 0.3, 1)` at 700ms.

### Keyframe

```js
el.animate([
  { opacity: 0.001, transform: 'perspective(1200px) translateY(48px) scale(0.96)' },
  { opacity: 1,     transform: 'perspective(1200px) translateY(0px) scale(1)' }
], { duration: springDuration * 1000, easing: springEasing, fill: 'forwards' });
```

The `opacity: 0.001` (not `0`) prevents the browser from short-circuiting the 3D paint layer.

---

## Draggable Shapes with Spring-Back

**Function:** `setupDraggableShapes()`

Six `.shape` elements (fixed-position PNG images) are draggable. On release, they spring back to their CSS-defined origin using a real-time physics simulation.

### Drag Mechanics

- `pointerdown` / `touchstart` → capture pointer offset from element center
- `pointermove` / `touchmove` → update `offsetX/offsetY`, apply `translate(dx, dy) + baseTransform`
- `pointerup` / `touchend` → record release velocity, begin spring-back

Velocity is computed from the last two pointer positions:

```js
velocityX = (pos.x - lastX) / dt * 1000;  // px/s
velocityY = (pos.y - lastY) / dt * 1000;
```

### Spring-Back Simulation

`doSpringBack()` runs a **semi-implicit Euler** integration in a `requestAnimationFrame` loop:

```
Parameters: stiffness=300, damping=25, mass=1
ζ = 25 / (2 * sqrt(300)) ≈ 0.72  (underdamped — light bounce)

Each frame:
  force = -stiffness * position - damping * velocity
  velocity += (force / mass) * dt
  position += velocity * dt
```

`dt` is clamped to 64ms max to prevent explosion if the tab loses focus mid-animation.

**Settle condition:** `|x| < 0.5px && |y| < 0.5px && |vx| < 10px/s && |vy| < 10px/s`

### Base Transform Preservation

Each shape has a CSS `transform` (rotate, translate) baked in. The JS reads this at setup time:

```js
var baseTransform = getComputedStyle(shape).transform;
```

And prepends the drag offset:

```js
shape.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) ' + baseTransform;
```

This means dragging never clobbers the shape's original orientation.

---

## Fullpage Scroll (easeOutExpo)

**Function:** `setupFullpageScroll()`

Intercepts all wheel and touch events to produce section-by-section navigation with a smooth `easeOutExpo` animation. No native browser scroll between sections.

### State Machine

```
idle ──[input]──> transitioning ──[animation ends]──> idle (after 50ms cooldown)
                      │
                      └──[new input ignored while transitioning]
```

Variables:

| Variable | Role |
|----------|------|
| `currentIdx` | Index of the currently visible section |
| `targetY` | `scrollY` value for the destination section |
| `startY` | `scrollY` at the moment navigation began |
| `startTime` | `performance.now()` at navigation start |
| `animDur` | Duration in ms (480–620, scaled by jump distance) |
| `transitioning` | Blocks new input until animation settles |

### Easing Function

```js
function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
```

At t=0: position=0. At t=1: position=1. The curve starts nearly vertical (fast acceleration) and flattens exponentially (asymptotic approach to target). No overshoot.

### Animation Loop

```js
function animateTick(now) {
  var t = Math.min((now - startTime) / animDur, 1);
  window.scrollTo(0, startY + (targetY - startY) * easeOutExpo(t));
  if (t < 1) {
    rafId = requestAnimationFrame(animateTick);
  } else {
    window.scrollTo(0, targetY);   // snap to exact pixel
    rafId = null;
    setTimeout(function () { transitioning = false; }, 50);
  }
}
```

### Duration Scaling

Multi-section jumps get slightly more time so the animation doesn't feel instantaneous:

```js
animDur = Math.min(480 + jumped * 80, 620);
// 1 section: 480ms
// 2 sections: 560ms
// 3+ sections: 620ms (cap)
```

### Input Sources

| Event | Handling |
|-------|----------|
| `wheel` | Accumulate `deltaY`; advance section when `|accum| > 48`. Internal section overflow scrolls first. |
| `touchstart` / `touchend` | Swipe if `|dy| > 50px` |
| `a[href^="#"]` click | Resolve section index, call `goTo(idx)` |
| `.fp-dot` click | Call `goTo(idx)` directly |

### Dots Indicator

Built and appended at runtime:

```html
<div class="fp-indicator">
  <div class="fp-dot-wrapper">
    <div class="fp-dot active"></div>
    <span class="fp-dot-label">Home</span>
  </div>
  <!-- …one per section… -->
  <div class="fp-arrow"></div>
</div>
```

`updateIndicator(idx)` removes `.active` from all dots, forces a reflow (`dot.offsetWidth`) to reset the keyframe animation, then adds `.active` to the new dot. The reflow trick is necessary because adding the same class to the same element doesn't re-trigger `@keyframes`.

---

## Scroll Reveal

**Function:** `setupScrollReveal()`

Elements with `data-reveal="N"` inside each `section[id]` animate in when the section enters the viewport, staggered by index.

### Markup Convention

```html
<section id="features" class="section-page">
  <div class="features-intro-inner" data-reveal="0">...</div>
  <div class="mockup-wrapper"        data-reveal="1">...</div>
  <div class="features-section-header" data-reveal="2">...</div>
  <div class="feature-card"          data-reveal="3">...</div>
  <div class="feature-card"          data-reveal="4">...</div>
  <div class="feature-card"          data-reveal="5">...</div>
</section>
```

### Initial Hidden State

Set synchronously before any paint:

```js
el.style.opacity   = '0';
el.style.transform = 'translateY(36px) scale(0.97)';
el.style.willChange = 'opacity, transform';
```

### Observer

```js
new IntersectionObserver(callback, { threshold: 0.1 })
```

Fires when 10% of the section is visible. Each section observer unobserves itself on first trigger (one-shot).

### Keyframe

```js
el.animate([
  { opacity: 0, transform: 'translateY(36px) scale(0.97)' },
  { opacity: 1, transform: 'translateY(0px) scale(1)' }
], {
  duration: 700,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // spring overshoot
  fill: 'forwards'
});
```

`cubic-bezier(0.34, 1.56, 0.64, 1)` — the Y control points go above 1.0, producing ~5–8% overshoot (the element briefly goes slightly above its resting position before settling). This mimics an underdamped spring without runtime physics.

**Stagger delay:** `index × 120ms`. Element at `data-reveal="3"` starts 360ms after the section enters.

---

## Ticker Marquee

**Files:** `css/animations.css`, `css/pages/home.css`

Pure CSS. The `.ticker-track` contains 6 repetitions of "PALETTE" and is animated with:

```css
@keyframes ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
animation: ticker-scroll 40s linear infinite;
```

Using 6 copies and translating by -50% means the loop is seamless — when the first 3 copies scroll off-screen, the last 3 replace them identically.

The ticker is wrapped in `.ticker-inner` (rotated 3°) which is inside `.ticker-wrapper` (fixed, full-viewport, `pointer-events: none`, `z-index: 1`). It renders behind the hero content (`z-index: 5`) but above the background image (`z-index: 0`).

---

## Nav Active State

**File:** `js/nav.js`

Uses `IntersectionObserver` at `threshold: 0.35` with `rootMargin: '-64px 0px 0px 0px'` (offset for the fixed nav height). When a section crosses the threshold, the corresponding `a[href="#sectionId"]` in `.nav-links` gets the `.active` class.

The `.active` class triggers:
- `font-weight: 600`
- `color: var(--ink)`
- `animation: nav-active-pop 0.3s` (scale bounce via keyframes in `styles.css`)

On mobile (`< 810px`) the `.nav-links` are hidden and replaced by `.nav-mobile`, which the hamburger toggle shows/hides. The toggle animates its three `<span>` bars into an X on open.

---

## Design Token Reference

All tokens are CSS custom properties in `:root` (`css/styles.css`):

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `rgb(210, 234, 246)` | Page background |
| `--bg-blur` | `rgba(210, 234, 246, 0.72)` | Frosted nav/mobile drawer |
| `--ink` | `#0a0a0a` | Primary text |
| `--ink-secondary` | `rgba(10,10,10,0.55)` | Body text, muted |
| `--ink-tertiary` | `rgba(10,10,10,0.32)` | Labels, hints |
| `--surface` | `rgba(255,255,255,0.52)` | Glass card backgrounds |
| `--border` | `rgba(255,255,255,0.72)` | Glass card borders |
| `--border-ink` | `rgba(10,10,10,0.1)` | Subtle dividers |
| `--grad-iris` | `135deg, #818cf8 → #67e8f9 → #c084fc` | Gradient fills (shapes) |
| `--grad-iris-text` | `120deg, #6366f1 → #22d3ee → #a855f7` | Gradient text (`.grad-text`) |
| `--radius-sm/md/lg/pill` | `10/18/28/999px` | Border radii |
| `--font-display` | `Playfair Display, Georgia, serif` | Italic headings |
| `--font-body` | `DM Sans, sans-serif` | All body text |
| `--font-logo` | `Braah One, sans-serif` | Nav logo, ticker |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | UI element transitions |
| `--ease-in-out` | `cubic-bezier(0.44, 0, 0.56, 1)` | Nav link hover |

### Breakpoints

| Name | Range | Notes |
|------|-------|-------|
| Mobile | `< 810px` | Single-column, shapes hidden, compact nav |
| Tablet | `810px – 1199px` | Reduced font sizes and padding |
| Desktop | `≥ 1200px` | Full layout |
