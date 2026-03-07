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
   * Fullpage spring scroll — section-by-section navigation with damping
   */
  function setupFullpageScroll() {
    var sections = Array.from(document.querySelectorAll('section[id]'));
    if (!sections.length) return;

    var currentIdx = 0;
    var transitioning = false;
    var targetY = 0;
    var rafId = null;

    var startY = 0;
    var startTime = 0;
    var animDur = 480;

    function getSectionTop(idx) {
      return sections[idx] ? sections[idx].offsetTop : 0;
    }

    function easeOutExpo(t) {
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function animateTick(now) {
      var t = Math.min((now - startTime) / animDur, 1);
      window.scrollTo(0, startY + (targetY - startY) * easeOutExpo(t));
      if (t < 1) {
        rafId = requestAnimationFrame(animateTick);
      } else {
        window.scrollTo(0, targetY);
        rafId = null;
        setTimeout(function () { transitioning = false; }, 50);
      }
    }

    function goTo(idx) {
      if (idx < 0) idx = 0;
      if (idx >= sections.length) idx = sections.length - 1;
      var jumped = Math.abs(idx - currentIdx);
      currentIdx = idx;
      targetY = getSectionTop(idx);
      transitioning = true;
      startY = window.scrollY;
      startTime = performance.now();
      animDur = Math.min(480 + jumped * 80, 620);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animateTick);
      updateIndicator(idx);
    }

    // Wheel — allow internal section scroll first, then advance section
    var wheelAccum = 0;
    var wheelTimer = null;

    window.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (transitioning) return;

      // If this section has internal overflow, scroll it first
      var sec = sections[currentIdx];
      var canDown = sec.scrollTop + sec.clientHeight < sec.scrollHeight - 3;
      var canUp   = sec.scrollTop > 3;

      if (e.deltaY > 0 && canDown) {
        sec.scrollTop += e.deltaY;
        return;
      }
      if (e.deltaY < 0 && canUp) {
        sec.scrollTop += e.deltaY;
        return;
      }

      // Accumulate intent to change section
      wheelAccum += e.deltaY;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { wheelAccum = 0; }, 200);

      if (Math.abs(wheelAccum) > 48) {
        var dir = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        goTo(currentIdx + dir);
      }
    }, { passive: false });

    // Touch swipe
    var touchY0 = 0;
    window.addEventListener('touchstart', function (e) {
      touchY0 = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
      if (transitioning) return;
      var dy = touchY0 - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) goTo(currentIdx + (dy > 0 ? 1 : -1));
    }, { passive: true });

    // Nav / anchor clicks
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = this.getAttribute('href').slice(1);
        var idx = sections.findIndex(function (s) { return s.id === id; });
        if (idx !== -1) {
          e.preventDefault();
          goTo(idx);
        }
      });
    });

    // Build right-side indicator
    var sectionNames = { home: 'Home', features: 'Features', waitlist: 'Waitlist', contact: 'Contact' };
    var indicator = document.createElement('div');
    indicator.className = 'fp-indicator';
    sections.forEach(function (s, i) {
      var wrapper = document.createElement('div');
      wrapper.className = 'fp-dot-wrapper';
      var dot = document.createElement('div');
      dot.className = 'fp-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', function () { goTo(i); });
      var label = document.createElement('span');
      label.className = 'fp-dot-label';
      label.textContent = sectionNames[s.id] || s.id;
      wrapper.appendChild(dot);
      wrapper.appendChild(label);
      indicator.appendChild(wrapper);
    });
    var arrow = document.createElement('div');
    arrow.className = 'fp-arrow';
    indicator.appendChild(arrow);
    document.body.appendChild(indicator);

    function updateIndicator(idx) {
      indicator.querySelectorAll('.fp-dot').forEach(function (dot, i) {
        dot.classList.remove('active');
        if (i === idx) {
          void dot.offsetWidth; // force reflow to replay animation
          dot.classList.add('active');
        }
      });
      arrow.style.opacity = idx >= sections.length - 1 ? '0' : '1';
    }

    // Detect initial section (e.g. if page loaded with hash)
    function detectInitial() {
      var mid = window.scrollY + window.innerHeight / 2;
      var found = 0;
      sections.forEach(function (s, i) {
        if (s.offsetTop <= mid) found = i;
      });
      currentIdx = found;
      updateIndicator(found);
    }
    detectInitial();
  }

  /**
   * Spring scroll reveal — animate [data-reveal] children as sections enter viewport
   */
  function setupScrollReveal() {
    if (typeof Element.prototype.animate !== 'function') return;

    var springEasingReveal = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    var revealDuration = 700;
    var staggerDelay = 120; // ms between each data-reveal element

    // Gather all sections with [data-reveal] children
    var sections = document.querySelectorAll('section[id]');

    sections.forEach(function (section) {
      var targets = section.querySelectorAll('[data-reveal]');
      if (!targets.length) return;

      // Set initial hidden state
      targets.forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(36px) scale(0.97)';
        el.style.willChange = 'opacity, transform';
      });

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);

          var sectionTargets = entry.target.querySelectorAll('[data-reveal]');
          sectionTargets.forEach(function (el) {
            var index = parseInt(el.getAttribute('data-reveal'), 10) || 0;
            var delay = index * staggerDelay;
            setTimeout(function () {
              try {
                el.animate([
                  { opacity: 0, transform: 'translateY(36px) scale(0.97)' },
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
          });
        });
      }, { threshold: 0.1 });

      observer.observe(section);
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
    setupForm();
    setupDraggableShapes();
    setupFullpageScroll();
    setupScrollReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
