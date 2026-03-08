/* ============================================================
   PALETTE — palette.js
   PhoneFeed · TextVideoMask · fp-indicator · Draggable Shapes
   ============================================================ */
(function () {
  'use strict';

  /* ── PhoneFeed ────────────────────────────────────────────── */
  function PhoneFeed(feedEl) {
    this.feed = feedEl;
    this.items = Array.from(feedEl.querySelectorAll('.feed-item'));
    this.current = 0;
    this.init();
  }

  PhoneFeed.prototype.init = function () {
    var self = this;

    // IntersectionObserver: play/pause based on visibility within .feed
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var vid = e.target.querySelector('video');
        if (!vid) return;
        if (e.isIntersecting) {
          vid.play().catch(function () {});
        } else {
          vid.pause();
          vid.currentTime = 0;
        }
      });
    }, { root: self.feed, threshold: 0.6 });

    self.items.forEach(function (item) { io.observe(item); });

    // Wheel: throttled navigation
    var lastWheel = 0;
    self.feed.addEventListener('wheel', function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - lastWheel < 700) return;
      lastWheel = now;
      self.goTo(self.current + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    // Touch swipe
    var startY = 0;
    self.feed.addEventListener('touchstart', function (e) {
      startY = e.touches[0].clientY;
    }, { passive: true });
    self.feed.addEventListener('touchend', function (e) {
      var dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) self.goTo(self.current + (dy > 0 ? 1 : -1));
    }, { passive: true });

    // Play first video
    var firstVid = self.items[0] && self.items[0].querySelector('video');
    if (firstVid) {
      firstVid.play().catch(function () {});
    }
  };

  PhoneFeed.prototype.goTo = function (idx) {
    var clamped = Math.max(0, Math.min(idx, this.items.length - 1));
    this.items[clamped].scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.current = clamped;
  };

  /* ── TextVideoMask observer ───────────────────────────────── */
  function setupTextVideoMask() {
    var maskVid = document.querySelector('.tmask-vid');
    if (!maskVid) return;

    // Ensure it plays when visible (for mobile autoplay policies)
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          maskVid.play().catch(function () {});
        } else {
          maskVid.pause();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(maskVid.closest('.tmask') || maskVid);
  }

  /* ── fp-indicator ─────────────────────────────────────────── */
  function setupFpIndicator() {
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

    // Section labels
    var sectionNames = {
      hero: 'Hero',
      features: 'Studio',
      how: 'Technology',
      stats: 'Stats',
      access: 'Access'
    };

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
        s.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        void droplet.offsetWidth; // reflow
        droplet.classList.add('is-jumping');
      }
    }

    function updateIndicator(idx, options) {
      options = options || {};
      indicator.querySelectorAll('.fp-dot').forEach(function (dot, i) {
        dot.classList.toggle('active', i === idx);
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

    // Detect initial
    currentIdx = findActiveSectionIndex();
    updateIndicator(currentIdx, { silent: true });
  }

  /* ── Draggable Shapes (spring physics, from legacy) ──────── */
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

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    // Phone feed
    var feedEl = document.getElementById('phone-feed');
    if (feedEl) {
      new PhoneFeed(feedEl);
    }

    setupTextVideoMask();
    setupFpIndicator();
    setupDraggableShapes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
