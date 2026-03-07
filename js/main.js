/**
 * Spring Animation Engine
 * Ported from Framer Motion spring solver
 * Config: stiffness=186, damping=30, mass=1
 */

(function () {
  'use strict';

  // Spring parameters (from Framer source)
  const STIFFNESS = 186;
  const DAMPING = 30;
  const MASS = 1;

  /**
   * Solve underdamped spring at time t
   * Returns position (0 = start, 1 = rest)
   */
  function springPosition(t) {
    const omega0 = Math.sqrt(STIFFNESS / MASS);
    const zeta = DAMPING / (2 * Math.sqrt(STIFFNESS * MASS));

    if (zeta < 1) {
      // Underdamped
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega0 * t) *
        (Math.cos(omegaD * t) + (zeta * omega0 / omegaD) * Math.sin(omegaD * t));
    } else {
      // Critically damped / overdamped fallback
      return 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
    }
  }

  /**
   * Calculate spring duration (time to converge within threshold)
   */
  function getSpringDuration(threshold) {
    threshold = threshold || 0.001;
    let t = 0;
    const step = 1 / 60;
    let settled = false;

    while (!settled && t < 10) {
      t += step;
      const pos = springPosition(t);
      if (Math.abs(1 - pos) < threshold) {
        // Check if velocity is also near zero
        const vel = (springPosition(t + 0.001) - pos) / 0.001;
        if (Math.abs(vel) < threshold * 10) {
          settled = true;
        }
      }
    }
    return t;
  }

  /**
   * Generate CSS linear() easing from spring curve
   */
  function generateLinearEasing(numPoints) {
    numPoints = numPoints || 30;
    const duration = getSpringDuration();
    const points = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * duration;
      const value = springPosition(t);
      points.push(value.toFixed(4));
    }

    return 'linear(' + points.join(', ') + ')';
  }

  const springDuration = getSpringDuration();
  const springEasing = generateLinearEasing(30);

  // Check if linear() easing is supported (Chrome 113+, Safari 17+, Firefox 112+)
  const supportsLinearEasing = (function () {
    try {
      return CSS.supports('animation-timing-function', 'linear(0, 1)');
    } catch (e) {
      return false;
    }
  })();

  // Fallback easing when linear() isn't supported
  const fallbackEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const fallbackDuration = 700;

  // Animation configs: [selector, delay, perspectiveOverride]
  const animationTargets = [
    ['[data-animate="hero"]', 0.15, 1200],
  ];

  /**
   * Set initial hidden state for animated elements
   * Only hides if WAAPI is available (progressive enhancement)
   */
  function initAnimations() {
    if (typeof Element.prototype.animate !== 'function') return;
    animationTargets.forEach(function (config) {
      var el = document.querySelector(config[0]);
      if (el) {
        var perspective = config[2] || 1200;
        el.style.opacity = '0.001';
        el.style.transform = 'perspective(' + perspective + 'px) translateY(48px) scale(0.96)';
      }
    });
  }

  /**
   * Animate element using Web Animations API with spring easing (or fallback)
   */
  function animateElement(el, delay, perspective) {
    if (typeof el.animate !== 'function') return;
    var perspectiveVal = perspective || 1200;
    var easing = supportsLinearEasing ? springEasing : fallbackEasing;
    var duration = supportsLinearEasing ? springDuration * 1000 : fallbackDuration;

    setTimeout(function () {
      try {
        el.animate([
          {
            opacity: 0.001,
            transform: 'perspective(' + perspectiveVal + 'px) translateY(48px) scale(0.96)'
          },
          {
            opacity: 1,
            transform: 'perspective(' + perspectiveVal + 'px) translateY(0px) scale(1)'
          }
        ], {
          duration: duration,
          easing: easing,
          fill: 'forwards'
        });
      } catch (e) {
        // Animation failed — just show the element
        el.style.opacity = '1';
        el.style.transform = '';
      }
    }, delay * 1000);
  }

  /**
   * Trigger appear animations on load
   */
  function setupObserver() {
    animationTargets.forEach(function (config) {
      var el = document.querySelector(config[0]);
      if (el) {
        animateElement(el, config[1], config[2]);
      }
    });
  }

  /**
   * Draggable shapes with spring-back animation
   */
  function setupDraggableShapes() {
    var shapes = document.querySelectorAll('.shape');

    shapes.forEach(function (shape) {
      var offsetX = 0;
      var offsetY = 0;
      var startX = 0;
      var startY = 0;
      var isDragging = false;
      var velocityX = 0;
      var velocityY = 0;
      var lastX = 0;
      var lastY = 0;
      var lastTime = 0;
      var springAnimId = 0;

      // Capture the original CSS transform at setup time
      var baseTransform = getComputedStyle(shape).transform;
      if (baseTransform === 'none') baseTransform = '';

      function setTransform(dx, dy) {
        shape.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) ' + baseTransform;
      }

      function getPointerPos(e) {
        if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
      }

      function onPointerDown(e) {
        e.preventDefault();
        // Cancel any running spring-back
        if (springAnimId) { cancelAnimationFrame(springAnimId); springAnimId = 0; }

        isDragging = true;
        shape.classList.add('dragging');

        var pos = getPointerPos(e);
        startX = pos.x - offsetX;
        startY = pos.y - offsetY;
        lastX = pos.x;
        lastY = pos.y;
        lastTime = Date.now();
        velocityX = 0;
        velocityY = 0;

        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
      }

      function onPointerMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        var pos = getPointerPos(e);
        var now = Date.now();
        var dt = Math.max(now - lastTime, 1);

        velocityX = (pos.x - lastX) / dt * 1000;
        velocityY = (pos.y - lastY) / dt * 1000;

        lastX = pos.x;
        lastY = pos.y;
        lastTime = now;

        offsetX = pos.x - startX;
        offsetY = pos.y - startY;
        setTransform(offsetX, offsetY);
      }

      function onPointerUp() {
        isDragging = false;
        shape.classList.remove('dragging');
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseup', onPointerUp);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('touchend', onPointerUp);

        // Spring back to original position
        doSpringBack();
      }

      function doSpringBack() {
        var stiffness = 300;
        var damping = 25;
        var mass = 1;
        var x = offsetX;
        var y = offsetY;
        var vx = velocityX;
        var vy = velocityY;
        var prev = performance.now();

        function step(now) {
          var dt = Math.min((now - prev) / 1000, 0.064);
          prev = now;

          var fx = -stiffness * x - damping * vx;
          var fy = -stiffness * y - damping * vy;
          vx += (fx / mass) * dt;
          vy += (fy / mass) * dt;
          x += vx * dt;
          y += vy * dt;

          setTransform(x, y);

          if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5 && Math.abs(vx) < 10 && Math.abs(vy) < 10) {
            setTransform(0, 0);
            offsetX = 0;
            offsetY = 0;
            springAnimId = 0;
            return;
          }
          springAnimId = requestAnimationFrame(step);
        }
        springAnimId = requestAnimationFrame(step);
      }

      shape.addEventListener('mousedown', onPointerDown);
      shape.addEventListener('touchstart', onPointerDown, { passive: false });
    });
  }

  /**
   * Section indicator synced to native scrolling
   */
  function setupFullpageScroll() {
    var sections = Array.from(document.querySelectorAll('section[id]'));
    if (!sections.length) return;

    var currentIdx = 0;

    function findActiveSectionIndex() {
      var probeY = window.scrollY + window.innerHeight * 0.45;
      var found = 0;
      sections.forEach(function (s, i) {
        if (s.offsetTop <= probeY) found = i;
      });
      return found;
    }

    // Build right-side indicator
    var sectionNames = { home: 'Home', features: 'Features', waitlist: 'Waitlist', contact: 'Contact' };
    var indicator = document.querySelector('.fp-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'fp-indicator';
      document.body.appendChild(indicator);
    }
    indicator.innerHTML = '';
    var dotWrappers = [];
    sections.forEach(function (s, i) {
      var wrapper = document.createElement('div');
      wrapper.className = 'fp-dot-wrapper';
      var dot = document.createElement('div');
      dot.className = 'fp-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', function () {
        currentIdx = i;
        updateIndicator(i);
        sections[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      var label = document.createElement('span');
      label.className = 'fp-dot-label';
      label.textContent = sectionNames[s.id] || s.id;
      wrapper.appendChild(dot);
      wrapper.appendChild(label);
      indicator.appendChild(wrapper);
      dotWrappers.push(wrapper);
    });
    var droplet = document.createElement('div');
    droplet.className = 'fp-droplet';
    indicator.appendChild(droplet);
    var arrow = document.createElement('div');
    arrow.className = 'fp-arrow';
    indicator.appendChild(arrow);

    function moveDroplet(idx, animateJump) {
      var target = dotWrappers[idx];
      if (!target) return;
      var top = target.offsetTop + (target.offsetHeight - droplet.offsetHeight) / 2;
      droplet.style.top = top + 'px';
      if (animateJump) {
        droplet.classList.remove('is-jumping');
        void droplet.offsetWidth;
        droplet.classList.add('is-jumping');
      }
    }

    function updateIndicator(idx, options) {
      options = options || {};
      indicator.querySelectorAll('.fp-dot').forEach(function (dot, i) {
        dot.classList.remove('active');
        if (i === idx) {
          dot.classList.add('active');
        }
      });
      moveDroplet(idx, !options.silent);
      arrow.style.opacity = idx >= sections.length - 1 ? '0' : '1';
    }

    function syncFromScroll(silent) {
      var idx = findActiveSectionIndex();
      if (idx !== currentIdx) {
        currentIdx = idx;
        updateIndicator(idx, { silent: !!silent });
        return;
      }
      moveDroplet(currentIdx, false);
      arrow.style.opacity = currentIdx >= sections.length - 1 ? '0' : '1';
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        syncFromScroll(false);
      });
    }, { passive: true });

    window.addEventListener('resize', function () {
      syncFromScroll(true);
    });

    // Detect initial section (e.g. if page loaded with hash)
    function detectInitial() {
      currentIdx = findActiveSectionIndex();
      updateIndicator(currentIdx, { silent: true });
    }
    detectInitial();
  }

  /**
   * Waitlist feature carousel arrows
   */
  function setupWaitlistFeatureCarousel() {
    var wrap = document.querySelector('.waitlist-features');
    if (!wrap) return;

    var strip = wrap.querySelector('.waitlist-features-grid');
    var prevBtn = wrap.querySelector('[data-carousel-dir="prev"]');
    var nextBtn = wrap.querySelector('[data-carousel-dir="next"]');
    if (!strip || !prevBtn || !nextBtn) return;

    var prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      prefersReducedMotion = false;
    }

    function getGapPx() {
      var styles = window.getComputedStyle(strip);
      var rawGap = styles.columnGap || styles.gap || '0';
      var val = parseFloat(rawGap);
      return isNaN(val) ? 0 : val;
    }

    function getStepPx() {
      var card = strip.querySelector('.waitlist-feature-card');
      if (!card) return Math.max(strip.clientWidth * 0.86, 260);
      return card.getBoundingClientRect().width + getGapPx();
    }

    function updateButtons() {
      var maxLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
      prevBtn.disabled = strip.scrollLeft <= 2;
      nextBtn.disabled = strip.scrollLeft >= maxLeft - 2;
    }

    function onArrowClick(dir) {
      var step = getStepPx();
      strip.scrollBy({
        left: dir * step,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }

    prevBtn.addEventListener('click', function () { onArrowClick(-1); });
    nextBtn.addEventListener('click', function () { onArrowClick(1); });
    strip.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);

    updateButtons();
  }

  /**
   * Scroll reveal — animate each [data-reveal] block when it enters viewport
   */
  function setupScrollReveal() {
    if (typeof Element.prototype.animate !== 'function') return;

    var springEasingReveal = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    var revealDuration = 560;
    var staggerDelay = 70; // ms between nearby reveal blocks
    var targets = Array.from(document.querySelectorAll('[data-reveal]')).filter(function (el) {
      return !el.classList.contains('feature-card');
    });
    if (!targets.length) return;

    // Set initial hidden state
    targets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px) scale(0.98)';
      el.style.willChange = 'opacity, transform';
    });

    function reveal(el) {
      var index = parseInt(el.getAttribute('data-reveal'), 10) || 0;
      var delay = Math.min(index * staggerDelay, 280);

      setTimeout(function () {
        try {
          el.animate([
            { opacity: 0, transform: 'translateY(28px) scale(0.98)' },
            { opacity: 1, transform: 'translateY(0px) scale(1)' }
          ], {
            duration: revealDuration,
            easing: springEasingReveal,
            fill: 'forwards'
          });
        } catch (e) {
          el.style.opacity = '1';
          el.style.transform = '';
        }
      }, delay);
    }

    if (typeof IntersectionObserver !== 'function') {
      targets.forEach(reveal);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        reveal(entry.target);
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -10% 0px'
    });

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /**
   * Feature cards motion: staggered reveal
   */
  function setupFeatureCardsMotion() {
    var cards = Array.from(document.querySelectorAll('.feature-card'));
    if (!cards.length) return;

    var prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      prefersReducedMotion = false;
    }

    if (!prefersReducedMotion) {
      document.body.classList.add('features-motion');
    }

    if (prefersReducedMotion || typeof IntersectionObserver !== 'function') {
      cards.forEach(function (card) {
        card.classList.add('is-visible');
      });
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        var idx = cards.indexOf(entry.target);
        var delay = Math.max(idx, 0) * 90;
        setTimeout(function () {
          entry.target.classList.add('is-visible');
        }, delay);
      });
    }, {
      threshold: 0.35,
      rootMargin: '0px 0px -8% 0px'
    });

    cards.forEach(function (card) {
      revealObserver.observe(card);
    });
  }

  /**
   * Form handling
   */
  function setupForm() {
    var form = document.querySelector('.email-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
      });
    }
  }

  /**
   * Initialize on DOM ready
   */
  function init() {
    initAnimations();
    setupObserver();
    setupFullpageScroll();
    setupForm();
    setupDraggableShapes();
    setupWaitlistFeatureCarousel();
    setupScrollReveal();
    setupFeatureCardsMotion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
