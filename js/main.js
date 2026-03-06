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

  // Animation configs: [selector, delay, perspectiveOverride]
  const animationTargets = [
    ['[data-animate="nav"]', 0.1, 1200],
    ['[data-animate="h1"]', 0.2, 1200],
    ['[data-animate="h2"]', 0.3, 500],
    ['[data-animate="email-form"]', 0.5, 1200],
    ['[data-animate="offset-text"]', 0.5, 1200],
    ['[data-animate="footer"]', 0.6, 1200],
  ];

  /**
   * Set initial hidden state for animated elements
   */
  function initAnimations() {
    animationTargets.forEach(function (config) {
      var el = document.querySelector(config[0]);
      if (el) {
        var perspective = config[2] || 1200;
        el.style.opacity = '0.001';
        el.style.transform = 'perspective(' + perspective + 'px) translateY(100px) scale(0.9)';
      }
    });
  }

  /**
   * Animate element using Web Animations API with spring easing
   */
  function animateElement(el, delay, perspective) {
    var perspectiveVal = perspective || 1200;

    setTimeout(function () {
      el.animate([
        {
          opacity: 0.001,
          transform: 'perspective(' + perspectiveVal + 'px) translateY(100px) scale(0.9)'
        },
        {
          opacity: 1,
          transform: 'perspective(' + perspectiveVal + 'px) translateY(0px) scale(1)'
        }
      ], {
        duration: springDuration * 1000,
        easing: springEasing,
        fill: 'forwards'
      });
    }, delay * 1000);
  }

  /**
   * Set up Intersection Observer for appear animations
   */
  function setupObserver() {
    // Since this is a single viewport page, trigger all animations on load
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
