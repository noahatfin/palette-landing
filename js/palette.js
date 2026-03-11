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
    if (self.items.length === 0) return;

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
      var savedAnimation = '';
      var hasAnimation = !!shape.style.animation || !!getComputedStyle(shape).animationName && getComputedStyle(shape).animationName !== 'none';

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
        // Freeze CSS animation: capture current transform, then disable animation
        baseTransform = getComputedStyle(shape).transform;
        if (baseTransform === 'none') baseTransform = '';
        savedAnimation = shape.style.animation;
        shape.style.animation = 'none';
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
            // Restore CSS animation
            shape.style.animation = savedAnimation;
            shape.style.transform = '';
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

  /* ── Hero Scroll Shrink ───────────────────────────────────── */
  function setupHeroShrink() {
    if (window.innerWidth < 810) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var vid      = document.querySelector('.hero-vid');
    var content  = document.querySelector('.hero-content');
    var target   = document.querySelector('.mockup-video');
    var heroWrap = document.querySelector('.hero-sticky-wrap');
    if (!vid || !target || !heroWrap) return;

    var headline = content ? content.querySelector('.hero-headline') : null;
    var eyebrow  = content ? content.querySelector('.hero-eyebrow') : null;
    var heroSub  = content ? content.querySelector('.hero-sub') : null;
    var heroCTA  = content ? content.querySelector('.btn') : null;

    var centerText = document.querySelector('.hero-center-text');
    var centerHL   = centerText ? centerText.querySelector('.hero-center-headline') : null;
    var centerMis  = centerText ? centerText.querySelector('.hero-center-mission') : null;
    var missionSection = document.querySelector('.mission');
    var hasMerged = false;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    var BOTTOM_GAP = 80;
    var FLY_ENTER = 0.65;   // fly to phone when iphone-screen top < 65% viewport
    var FLY_EXIT  = 0.75;   // restore from phone when iphone-screen top > 75% viewport
    var isDocked = false;
    var isUndocking = false;
    var undockTimeout = 0;

    var params = {};
    function calcParams() {
      var r = target.getBoundingClientRect();
      var docTop  = r.top  + window.scrollY;
      var docLeft = r.left + window.scrollX;
      var mW = r.width, mH = r.height;
      var vidH = window.innerHeight - BOTTOM_GAP;

      var scrollEnd = docTop + mH / 2 - window.innerHeight / 2;
      var s  = Math.min(mW / window.innerWidth, mH / vidH);
      var tx = (docLeft + mW / 2) - window.innerWidth / 2;
      var ty = BOTTOM_GAP / 2;

      params = { scrollEnd: scrollEnd, scale: s, tx: tx, ty: ty };
    }
    calcParams();

    window.addEventListener('resize', calcParams);

    // Dock: reparent into .mockup-video, keep shrunk size (centered in panel)
    function dock() {
      if (isDocked) return;
      isDocked = true;

      clearTimeout(undockTimeout);
      isUndocking = false;
      vid.style.transition = '';

      // FLIP: capture current visual position before reparent
      var firstRect = vid.getBoundingClientRect();

      var s    = params.scale;
      var dockedW = window.innerWidth  * s;
      var dockedH = (window.innerHeight - BOTTOM_GAP) * s;
      var panelW  = target.offsetWidth;
      var panelH  = target.offsetHeight;
      vid.style.transform    = '';
      vid.style.borderRadius = '12px';
      target.appendChild(vid);
      vid.style.position      = 'absolute';
      vid.style.inset         = '';
      vid.style.width         = dockedW + 'px';
      vid.style.height        = dockedH + 'px';
      vid.style.left          = ((panelW - dockedW) / 2) + 'px';
      vid.style.top           = ((panelH - dockedH) / 2) + 'px';
      vid.style.objectFit     = 'cover';
      vid.style.zIndex        = '1';
      vid.style.pointerEvents = 'none';
      if (centerHL) centerHL.style.opacity = '0';

      // FLIP: animate from old position to docked position
      var lastRect = vid.getBoundingClientRect();
      var dx = firstRect.left - lastRect.left;
      var dy = firstRect.top  - lastRect.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        vid.style.transformOrigin = '0 0';
        vid.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        vid.style.transition = 'none';
        void vid.offsetWidth;
        vid.style.transition = 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)';
        vid.style.transform = 'translate(0,0)';
        setTimeout(function () {
          vid.style.transition = '';
          vid.style.transform = '';
          vid.style.transformOrigin = '';
        }, 300);
      }
    }

    function undock() {
      if (!isDocked) return;
      isDocked = false;

      var firstRect = vid.getBoundingClientRect();

      vid.style.position      = '';
      vid.style.inset         = '';
      vid.style.width         = '';
      vid.style.height        = '';
      vid.style.left          = '';
      vid.style.top           = '';
      vid.style.objectFit     = '';
      vid.style.zIndex        = '';
      vid.style.pointerEvents = '';
      heroWrap.appendChild(vid);

      vid.style.transform = 'none';
      var rawRect = vid.getBoundingClientRect();

      var firstCenterX = firstRect.left + firstRect.width / 2;
      var firstCenterY = firstRect.top + firstRect.height / 2;
      var rawCenterX = rawRect.left + rawRect.width / 2;
      var rawCenterY = rawRect.top + rawRect.height / 2;

      var dx = firstCenterX - rawCenterX;
      var dy = firstCenterY - rawCenterY;

      vid.style.transformOrigin = '50% 50%';
      vid.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + params.scale + ')';
      vid.style.borderRadius = '12px';
      vid.style.transition = 'none';

      void vid.offsetWidth;

      isUndocking = true;
      vid.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
      
      clearTimeout(undockTimeout);
      undockTimeout = setTimeout(function() {
        isUndocking = false;
        vid.style.transition = '';
        vid.style.transformOrigin = '';
      }, 400);
    }

    var phoneScreen = document.querySelector('.products-phone .iphone-screen');
    var hasFlewToPhone = false;
    var isFlying = false;

    function flyToPhone() {
      if (hasFlewToPhone || isFlying || !phoneScreen) return;
      hasFlewToPhone = true;
      isFlying = true;

      var firstRect = vid.getBoundingClientRect();
      var device = document.querySelector('.iphone-device');
      var productsPhone = document.querySelector('.products-phone');

      if (device) device.style.overflow = 'visible';
      if (phoneScreen) phoneScreen.style.overflow = 'visible';
      if (productsPhone) productsPhone.style.zIndex = '100';

      phoneScreen.insertBefore(vid, phoneScreen.firstChild);
      vid.style.transform    = '';
      vid.style.position     = 'absolute';
      vid.style.inset        = '0';
      vid.style.width        = '100%';
      vid.style.height       = '100%';
      vid.style.zIndex       = '100';
      vid.style.borderRadius = '50px';
      isDocked = false;

      var lastRect = vid.getBoundingClientRect();

      var dx = firstRect.left - lastRect.left;
      var dy = firstRect.top - lastRect.top;
      var sw = firstRect.width / lastRect.width;
      var sh = firstRect.height / lastRect.height;

      vid.style.transformOrigin = '0 0';
      vid.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + sw + ', ' + sh + ')';
      vid.style.borderRadius = '12px';
      vid.style.transition = 'none';

      void vid.offsetWidth;

      vid.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      vid.style.transform = 'translate(0px, 0px) scale(1, 1)';
      vid.style.borderRadius = '50px';

      setTimeout(function() {
        if (!isFlying) return;
        vid.style.transition = '';
        vid.style.transform = '';
        vid.style.transformOrigin = '';
        vid.style.borderRadius = '';
        vid.style.zIndex = '1';
        
        if (device) device.style.overflow = '';
        if (phoneScreen) phoneScreen.style.overflow = '';
        if (productsPhone) productsPhone.style.zIndex = '';
        isFlying = false;
      }, 500);
    }

    function flyFromPhone() {
      if (!hasFlewToPhone || isFlying) return;
      hasFlewToPhone = false;
      isFlying = true;

      var firstRect = vid.getBoundingClientRect();
      var device = document.querySelector('.iphone-device');
      var productsPhone = document.querySelector('.products-phone');

      if (device) device.style.overflow = 'visible';
      if (phoneScreen) phoneScreen.style.overflow = 'visible';
      if (productsPhone) productsPhone.style.zIndex = '100';
      if (target) {
        target.style.overflow = 'visible';
        target.style.zIndex = '100';
      }

      dock(); // Sets isDocked = true and puts vid into target

      var lastRect = vid.getBoundingClientRect();

      var dx = firstRect.left - lastRect.left;
      var dy = firstRect.top - lastRect.top;
      var sw = firstRect.width / lastRect.width;
      var sh = firstRect.height / lastRect.height;

      vid.style.transformOrigin = '0 0';
      vid.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + sw + ', ' + sh + ')';
      vid.style.borderRadius = '50px';
      vid.style.transition = 'none';

      void vid.offsetWidth;

      vid.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      vid.style.transform = 'translate(0px, 0px) scale(1, 1)';
      vid.style.borderRadius = '12px';

      setTimeout(function() {
        if (!isFlying) return;
        vid.style.transition = '';
        vid.style.transform = '';
        vid.style.transformOrigin = '';
        vid.style.borderRadius = '12px';
        
        if (device) device.style.overflow = '';
        if (phoneScreen) phoneScreen.style.overflow = '';
        if (productsPhone) productsPhone.style.zIndex = '';
        if (target) {
          target.style.overflow = '';
          target.style.zIndex = '';
        }
        isFlying = false;
      }, 500);
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (isFlying) return;

        var scrollY = window.scrollY;

        // ── IN_PHONE: restore when phone exits viewport below ────
        if (hasFlewToPhone) {
          var r = phoneScreen.getBoundingClientRect();
          if (r.top > window.innerHeight * FLY_EXIT) {
            flyFromPhone();   // → DOCKED or HERO
          }
          return;
        }

        // ── Ensure docked if past scrollEnd (handles fast-scroll) ─
        var p = clamp(scrollY / params.scrollEnd, 0, 1);
        if (p >= 1 && !isDocked) { dock(); }

        // ── DOCKED ───────────────────────────────────────────────
        if (isDocked) {
          var r = phoneScreen.getBoundingClientRect();
          if (r.top < window.innerHeight * FLY_ENTER) {
            flyToPhone(); return;
          }
          if (scrollY < params.scrollEnd - window.innerHeight * 0.25) {
            undock(); // fall through to HERO
          } else {
            return;   // snap: stay docked
          }
        }

        // ── HERO (scroll-driven) ─────────────────────────────────
        p = clamp(scrollY / params.scrollEnd, 0, 1);
        var e  = ease(p);
        vid.style.transform    = 'translate(' + lerp(0, params.tx, e) + 'px,' +
                                  lerp(0, params.ty, e) + 'px) scale(' + lerp(1, params.scale, e) + ')';
        vid.style.borderRadius = lerp(0, 12, e) + 'px';
        if (content) {
          // Fade out ALL bottom-left content over p 0.00–0.10
          var contentFade = clamp(p / 0.10, 0, 1);
          content.style.opacity       = 1 - contentFade;
          content.style.pointerEvents = p > 0.05 ? 'none' : '';
        }
        // Centered text overlay
        // Headline: entrance at p 0.18–0.32, holds until p 0.58, crossfades out at p 0.58–0.72
        if (centerHL) {
          var hlIn  = ease(clamp((p - 0.18) / 0.14, 0, 1));
          var hlOut = ease(clamp((p - 0.58) / 0.14, 0, 1));
          centerHL.style.opacity   = hlIn * (1 - hlOut);
          var scaleIn = lerp(0.92, 1, hlIn);
          var yIn     = lerp(40, 0, hlIn);
          var yOut    = lerp(0, -30, hlOut);
          centerHL.style.transform = 'translateY(' + (yIn + yOut) + 'px) scale(' + scaleIn * (1 - hlOut * 0.08) + ')';
          if (hlIn > 0.01) centerHL.classList.add('is-visible');
          else centerHL.classList.remove('is-visible');
        }
        // Mission fades in at p 0.58–0.72, stays visible (merge handled separately)
        if (centerMis && !hasMerged) {
          var misIn = ease(clamp((p - 0.58) / 0.14, 0, 1));
          centerMis.style.opacity = misIn;
          centerMis.style.transform = 'translateY(' + lerp(30, 0, misIn) + 'px)';
        }
      });
    }, { passive: true });

    // Mission text merge: overlay → real text seamless handoff
    var missionText = document.querySelector('.mission-text');

    window.addEventListener('scroll', function () {
      if (!centerMis || !missionText) return;
      var mtRect = missionText.getBoundingClientRect();
      var mtCenter = mtRect.top + mtRect.height / 2;
      var vpCenter = window.innerHeight / 2;

      if (mtCenter <= vpCenter && !hasMerged) {
        hasMerged = true;
        // 1. Instantly show real text as white (same as overlay)
        missionText.style.transition = 'none';
        missionText.style.opacity = '1';
        missionText.style.color = 'var(--cream)';
        missionText.style.transform = 'translateY(0)';
        missionText.style.textShadow = '0 2px 32px rgba(0,0,0,0.5)';
        // 2. Hide overlay (same frame — visually seamless)
        centerMis.style.opacity = '0';
        // 3. Force reflow, then transition color to black
        void missionText.offsetWidth;
        missionText.style.transition = 'color 1.0s ease, text-shadow 0.8s ease';
        missionText.style.color = '';
        missionText.style.textShadow = '';
        missionText.classList.add('is-revealed');
      } else if (mtCenter > vpCenter && hasMerged) {
        // Reverse: restore overlay, hide real text
        hasMerged = false;
        missionText.classList.remove('is-revealed');
        missionText.style.transition = 'none';
        missionText.style.opacity = '0';
        missionText.style.color = '';
        missionText.style.transform = '';
        missionText.style.textShadow = '';
        centerMis.style.opacity = '1';
      }
    }, { passive: true });
  }

  /* ── iPhone Enter Zone ───────────────────────────────────── */
  function setupIphoneEnter() {
    if (window.innerWidth < 810) return;
    var zone = document.querySelector('.iphone-enter');
    var device = document.getElementById('iphone-enter-device');
    if (!zone || !device) return;

    var heartsEl = document.getElementById('iphone-enter-hearts');
    var danmakuEl = document.getElementById('iphone-enter-danmaku');
    var danmakuTexts = ['This AI is unreal', 'So smooth', 'Can I get early access?', 'Amazing results!'];

    function spawnHeart(container) {
      var h = document.createElement('div');
      h.className = 'tiktok-heart';
      h.textContent = ['❤️','🧡','💜','💙'][Math.floor(Math.random()*4)];
      h.style.left = (50 + Math.random() * 35) + '%';
      h.style.setProperty('--dur', (1.2 + Math.random() * 0.8) + 's');
      container.appendChild(h);
      setTimeout(function() { h.remove(); }, 2200);
    }

    function spawnComment(container) {
      var c = document.createElement('div');
      c.className = 'tiktok-danmaku-item';
      c.textContent = danmakuTexts[Math.floor(Math.random() * danmakuTexts.length)];
      c.style.top = (15 + Math.random() * 60) + '%';
      container.appendChild(c);
      setTimeout(function() { c.remove(); }, 4000);
    }

    var ambientTimer = null;
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !ambientTimer) {
          ambientTimer = setInterval(function() {
            if (heartsEl) { for (var i=0;i<4;i++) setTimeout(spawnHeart.bind(null,heartsEl), i*200); }
            if (danmakuEl) setTimeout(spawnComment.bind(null,danmakuEl), 600);
          }, 3000);
        } else if (!e.isIntersecting && ambientTimer) {
          clearInterval(ambientTimer);
          ambientTimer = null;
        }
      });
    }, { threshold: 0.2 });
    io.observe(zone);
  }

  /* ── Products Section — scroll-driven ────────────────────── */
  function setupProductsScroll() {
    var scrollContainer = document.getElementById('products-scroll');
    var features = Array.from(document.querySelectorAll('.products-feature'));
    var feedItems = Array.from(document.querySelectorAll('.phone-feed .feed-item'));
    var dots = Array.from(document.querySelectorAll('.progress-dot'));
    var hintEl = document.getElementById('products-scroll-hint');
    var heartsEl = document.getElementById('products-hearts');
    var likeEl   = document.getElementById('products-like-count');
    var danmakuEl = document.getElementById('products-danmaku');

    if (!scrollContainer || !features.length) return;
    if (window.innerWidth < 810) return; // mobile: no scroll-driven logic

    var totalSteps = features.length;
    var currentIdx = 0;

    var likeCounts = [246000, 382000, 518000];
    var commentSets = [
      ['This AI is unbelievable!', 'So natural!', 'Can\'t wait to try it'],
      ['The cinematography is insane', 'Director mode is fire', 'Bookmarked!'],
      ['One-click export?', 'The future is here', 'Game changer']
    ];

    function formatCount(n) {
      return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString();
    }

    function spawnHearts(container, count) {
      for (var i = 0; i < count; i++) {
        (function(i) {
          setTimeout(function() {
            var h = document.createElement('div');
            h.className = 'tiktok-heart';
            h.textContent = ['❤️','🧡','💜'][i % 3];
            h.style.left = (48 + Math.random() * 36) + '%';
            h.style.setProperty('--dur', (1.1 + Math.random() * 0.8) + 's');
            container.appendChild(h);
            setTimeout(function() { h.remove(); }, 2200);
          }, i * 160);
        })(i);
      }
    }

    function spawnComment(container, text) {
      var c = document.createElement('div');
      c.className = 'tiktok-danmaku-item';
      c.textContent = text;
      c.style.top = (12 + Math.random() * 58) + '%';
      container.appendChild(c);
      setTimeout(function() { c.remove(); }, 4000);
    }

    // Hero video is the first "feed" — it's already in the phone via flyToPhone.
    // feedItems (from .phone-feed) are only the 2nd and 3rd videos.
    var heroVid = document.querySelector('.hero-vid');

    function setStep(newIdx) {
      if (newIdx === currentIdx) return;
      currentIdx = newIdx;

      // Text crossfade
      features.forEach(function(f, i) {
        f.classList.toggle('is-active', i === newIdx);
      });

      // Phone feed: hero video = step 0, feedItems[0] = step 1, feedItems[1] = step 2
      if (heroVid) {
        if (newIdx === 0) {
          heroVid.style.transform = '';
          heroVid.style.transition = 'transform 0.55s cubic-bezier(0.22, 0.68, 0, 1)';
        } else {
          heroVid.style.transition = 'transform 0.55s cubic-bezier(0.22, 0.68, 0, 1)';
          heroVid.style.transform = 'translateY(-100%)';
        }
      }

      feedItems.forEach(function(item, i) {
        var stepIdx = i + 1; // feedItems[0] maps to step 1, feedItems[1] maps to step 2
        item.classList.remove('is-active', 'is-prev');
        var vid = item.querySelector('video');
        if (stepIdx === newIdx) {
          item.classList.add('is-active');
          if (vid) { vid.currentTime = 0; vid.play().catch(function(){}); }
        } else if (stepIdx < newIdx) {
          item.classList.add('is-prev');
          if (vid) vid.pause();
        } else {
          if (vid) vid.pause();
        }
      });

      // Progress dots
      dots.forEach(function(d, i) {
        d.classList.toggle('active', i === newIdx);
      });

      // Hearts burst
      if (heartsEl) spawnHearts(heartsEl, 6);

      // Like count
      if (likeEl) {
        likeEl.textContent = formatCount(likeCounts[newIdx] || 0);
        likeEl.classList.remove('like-bump');
        void likeEl.offsetWidth;
        likeEl.classList.add('like-bump');
      }

      // Danmaku
      var msgs = commentSets[newIdx] || [];
      msgs.forEach(function(msg, i) {
        if (danmakuEl) setTimeout(spawnComment.bind(null, danmakuEl, msg), i * 800);
      });
    }

    // Scroll handler
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        ticking = false;
        var rect = scrollContainer.getBoundingClientRect();
        var scrollDistance = rect.height - window.innerHeight;
        if (scrollDistance <= 0) return;
        var progress = Math.max(0, Math.min(1, -rect.top / scrollDistance));
        var newIdx = Math.min(Math.floor(progress * totalSteps), totalSteps - 1);
        setStep(newIdx);

        // Fade hint after first step
        if (hintEl) {
          hintEl.style.opacity = progress < 0.15 ? '1' : '0';
        }
      });
    }, { passive: true });

    // Ambient hearts
    setInterval(function() {
      if (heartsEl && currentIdx >= 0) spawnHearts(heartsEl, 2);
    }, 5000);
  }

  /* ── Chat Animation ───────────────────────────────────────── */
  function setupChatAnimation() {
    var chatPanel = document.querySelector('.mockup-chat');
    if (!chatPanel) return;

    var bubbles = Array.from(chatPanel.querySelectorAll('[data-chat]'));
    if (!bubbles.length) return;

    // Insert typing indicator before first AI bubble
    var typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    var firstAI = chatPanel.querySelector('.chat-bubble.ai');
    if (firstAI) { chatPanel.insertBefore(typingEl, firstAI); }

    function showBubble(i) { if (bubbles[i]) bubbles[i].classList.add('is-visible'); }
    function hideBubbles() { bubbles.forEach(function (b) { b.classList.remove('is-visible'); }); }
    function showTyping() { typingEl.classList.add('is-active'); }
    function hideTyping() { typingEl.classList.remove('is-active'); }

    function runSequence() {
      hideBubbles();
      hideTyping();
      setTimeout(function () { showBubble(0); }, 400);
      setTimeout(function () { showTyping(); }, 1200);
      setTimeout(function () { hideTyping(); showBubble(1); }, 2600);
      setTimeout(function () { showBubble(2); }, 3800);
      setTimeout(function () { showTyping(); }, 4600);
      setTimeout(function () { hideTyping(); showBubble(3); }, 6000);
      setTimeout(function () { hideBubbles(); hideTyping(); setTimeout(runSequence, 400); }, 9000);
    }

    var hasStarted = false;
    var appPreview = document.querySelector('.app-preview');
    if (!appPreview) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !hasStarted) {
          hasStarted = true;
          runSequence();
        }
      });
    }, { threshold: 0.35 });
    observer.observe(appPreview);
  }

  /* ── Nav theme swap (light/dark section detection) ──────── */
  function updateNavTheme() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    // Don't swap theme when scrolled (frosted dark bg takes over)
    if (nav.classList.contains('is-scrolled')) {
      nav.classList.remove('nav--light');
      return;
    }
    var lightSections = document.querySelectorAll('.section-light');
    var isOverLight = false;
    lightSections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= 0 && r.bottom > 0) isOverLight = true;
    });
    nav.classList.toggle('nav--light', isOverLight);
  }

  // Expose so main.js scroll handler can call it
  window._paletteUpdateNavTheme = updateNavTheme;

  /* ── Research Section Reveal ──────────────────────────────── */
  function setupResearchReveal() {
    var section = document.querySelector('.research');
    if (!section) return;

    var head    = section.querySelector('.section-head');
    var label   = section.querySelector('.section-label');
    var title   = section.querySelector('.section-title');
    var items   = section.querySelectorAll('.research-item');

    // Initial hidden state
    var targets = [];
    if (label) { label.style.opacity = '0'; label.style.transform = 'translateY(24px)'; targets.push(label); }
    if (title) { title.style.opacity = '0'; title.style.transform = 'translateY(32px)'; targets.push(title); }
    items.forEach(function (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(60px) scale(0.97)';
    });

    var revealed = false;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !revealed) {
          revealed = true;
          io.disconnect();

          // Animate header elements
          var delay = 0;
          targets.forEach(function (el) {
            el.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1) ' + delay + 's, transform 0.7s cubic-bezier(0.16,1,0.3,1) ' + delay + 's';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            delay += 0.12;
          });

          // Animate research items with stagger
          items.forEach(function (item, i) {
            var d = delay + i * 0.18;
            item.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1) ' + d + 's, transform 0.8s cubic-bezier(0.16,1,0.3,1) ' + d + 's';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0) scale(1)';
          });
        }
      });
    }, { threshold: 0.15 });

    io.observe(section);
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
    setupHeroShrink();
    setupChatAnimation();
    setupIphoneEnter();
    setupProductsScroll();
    setupResearchReveal();
    setupBackToTop();
    // Initial nav theme sync (palette.js loads after main.js's onScroll)
    updateNavTheme();
  }

  /* ── Scroll to top on refresh ─────────────────────────────── */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  /* ── Back-to-top button ───────────────────────────────────── */
  function setupBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    var lightSections = document.querySelectorAll('.section-light');

    function updateBtn() {
      var show = window.scrollY > window.innerHeight;
      btn.classList.toggle('is-visible', show);

      // Theme: check if button overlaps a light section
      var btnY = window.innerHeight - 40; // btn is fixed near bottom
      var isLight = false;
      lightSections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= btnY && r.bottom > btnY) isLight = true;
      });
      btn.classList.toggle('is-light', isLight);
    }

    window.addEventListener('scroll', updateBtn, { passive: true });
    updateBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
