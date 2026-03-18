/* ============================================================
   PALETTE — palette.js
   PhoneFeed · TextVideoMask · fp-indicator
   ============================================================ */
(function () {
  'use strict';

  /* ── Central scroll dispatcher ────────────────────────────
     All scroll handlers register here so the browser fires only
     ONE scroll listener and ONE requestAnimationFrame per frame
     instead of N separate RAF callbacks.
  ────────────────────────────────────────────────────────── */
  var _scrollHandlers = [];
  var _scrollTicking  = false;
  function addScrollHandler(fn) { _scrollHandlers.push(fn); }
  window.addEventListener('scroll', function () {
    if (_scrollTicking) return;
    _scrollTicking = true;
    requestAnimationFrame(function () {
      _scrollTicking = false;
      for (var i = 0; i < _scrollHandlers.length; i++) _scrollHandlers[i]();
    });
  }, { passive: true });

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
      cinematic: 'Cinematic',
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

    addScrollHandler(function () {
      syncFromScroll(false);
    });

    window.addEventListener('resize', function () {
      syncFromScroll(true);
    });

    // Detect initial
    currentIdx = findActiveSectionIndex();
    updateIndicator(currentIdx, { silent: true });
  }

  /* ── Hero Scroll Shrink ───────────────────────────────────── */
  function setupHeroShrink() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var isMobile = window.innerWidth < 810;

    var vid      = document.querySelector('.hero-vid');
    var content  = document.querySelector('.hero-content');
    var heroWrap = document.querySelector('.hero-sticky-wrap');
    if (!vid || !heroWrap) return;

    var centerText = document.querySelector('.hero-center-text');
    var centerHL   = (!isMobile && centerText) ? centerText.querySelector('.hero-center-headline') : null;
    var centerMis  = (!isMobile && centerText) ? centerText.querySelector('.hero-center-mission') : null;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    // scrollEnd: hero zone height minus viewport = actual scroll distance
    var heroEl = document.querySelector('.hero.hero-zone');
    var scrollEnd = heroEl ? (heroEl.offsetHeight - window.innerHeight) : window.innerHeight;

    addScrollHandler(function () {
        var scrollY = window.scrollY;

        // ── HERO (scroll-driven) ─────────────────────────────────
        var p = clamp(scrollY / scrollEnd, 0, 1);
        var e  = ease(p);

        // Scale down the video as user scrolls (capped at scale 0.6)
        // Dead zone: video stays full-scale for first 20% of scroll,
        // then shrinks over the remaining 80%
        // Skip if morph handler has taken over the transform
        if (!isMobile && !window._heroMorphActive) {
          var shrinkP = clamp((p - 0.2) / 0.8, 0, 1);
          var shrinkE = ease(shrinkP);
          var scale = lerp(1, 0.6, shrinkE);
          vid.style.transform = 'scale(' + scale + ')';
          vid.style.borderRadius = lerp(0, 12, shrinkE) + 'px';
          vid.style.opacity = '1';
        }

        if (content) {
          // Fade out ALL bottom-left content over p 0.00–0.10
          var contentFade = clamp(p / 0.10, 0, 1);
          content.style.opacity       = 1 - contentFade;
          content.style.pointerEvents = p > 0.05 ? 'none' : '';
        }
        // Centered text overlay
        // Headline: entrance at p 0.08–0.20, long hold, crossfades out at p 0.75–0.87
        if (centerHL) {
          var hlIn  = ease(clamp((p - 0.08) / 0.12, 0, 1));
          var hlOut = ease(clamp((p - 0.75) / 0.12, 0, 1));
          centerHL.style.opacity   = hlIn * (1 - hlOut);
          var scaleIn = lerp(0.92, 1, hlIn);
          var yIn     = lerp(40, 0, hlIn);
          var yOut    = lerp(0, -30, hlOut);
          centerHL.style.transform = 'translateY(' + (yIn + yOut) + 'px) scale(' + scaleIn * (1 - hlOut * 0.08) + ')';
          if (hlIn > 0.01) centerHL.classList.add('is-visible');
          else centerHL.classList.remove('is-visible');
        }
        // Mission crossfades in at p 0.75–0.87, fades out at p 0.92–1.0 (exits before video)
        if (centerMis) {
          var misIn  = ease(clamp((p - 0.75) / 0.12, 0, 1));
          var misOut = ease(clamp((p - 0.92) / 0.08, 0, 1));
          centerMis.style.opacity = misIn * (1 - misOut);
          centerMis.style.transform = 'translateY(' + lerp(30, 0, misIn) + 'px)';
        }
      });

  }

  /* ── Hero → Demo Morph (UI Assemble - Scheme A) ── */
  function setupHeroDemoMorph() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 810) return;

    var vid        = document.querySelector('.hero-vid');
    var demoApp    = document.querySelector('.demo-app');
    var demoSection = document.getElementById('demo');
    var centerTextEl = document.querySelector('.hero-center-text');
    var demoCanvas   = document.querySelector('.demo-canvas');
    if (!vid || !demoApp || !demoSection || !demoCanvas) return;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    var BOTTOM_GAP    = 80;
    var SNAP_TRIGGER  = 0.35;
    var MORPH_START   = 0.45; 

    var isSnapping     = false;
    var morphTriggered = false;
    var morphComplete  = false;
    var collapseAnim   = null;
    var curTx = 0, curTy = 0, curScale = 0.6, curRadius = 12;

    // Scroll lock helpers
    var lockHandler = function (e) { e.preventDefault(); };
    function lockScroll() {
      window.addEventListener('wheel', lockHandler, { passive: false });
      window.addEventListener('touchmove', lockHandler, { passive: false });
    }
    function unlockScroll() {
      window.removeEventListener('wheel', lockHandler);
      window.removeEventListener('touchmove', lockHandler);
    }

    function getTarget() {
      var r = demoCanvas.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: r.width, height: r.height };
    }

    function snapToDemo() {
      if (isSnapping) return;
      isSnapping = true;
      lockScroll();

      var targetY   = demoSection.offsetTop;
      var startY    = window.scrollY;
      var diff      = targetY - startY;
      var duration  = Math.min(700, Math.max(400, Math.abs(diff) * 0.4));
      var startTime = performance.now();

      function tick(now) {
        var t = Math.min((now - startTime) / duration, 1);
        var e = 1 - Math.pow(1 - t, 3);
        window.scrollTo(0, startY + diff * e);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          triggerAssemble();
        }
      }
      requestAnimationFrame(tick);
    }

    function triggerAssemble() {
      if (morphTriggered) return;
      morphTriggered = true;

      if (centerTextEl) {
        centerTextEl.style.transition = 'opacity 0.25s ease';
        centerTextEl.style.opacity = '0';
      }

      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var tgt = getTarget();

      var targetScale = Math.max(tgt.width / vw, tgt.height / (vh - BOTTOM_GAP));

      var MORPH_DUR = 450;

      window._heroCollapseAnim = collapseAnim = vid.animate([
        {
          transform: 'translate(0px, 0px) scale(' + curScale + ')',
          borderRadius: curRadius + 'px',
          boxShadow: '0 0 0 rgba(0,0,0,0)',
          opacity: 1
        },
        {
          transform: 'translate(0px, 0px) scale(' + (targetScale * 0.96) + ')',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          opacity: 1,
          offset: 0.4
        },
        {
          transform: 'translate(0px, 0px) scale(' + (targetScale * 1.02) + ')',
          borderRadius: '16px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
          opacity: 1,
          offset: 0.65
        },
        {
          transform: 'translate(0px, 0px) scale(' + targetScale + ')',
          borderRadius: '16px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
          opacity: 0, // Video dissolves smoothly to reveal storyboard
          offset: 1
        }
      ], {
        duration: MORPH_DUR,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards'
      });

      // At offset 0.65 (the bounce peak), fade in the UI
      setTimeout(function() {
        demoApp.classList.add('demo-intro');
        demoApp.classList.remove('collapsed');
        var chatInputEl = document.querySelector('.demo-chat-input');
        if (chatInputEl) {
          chatInputEl.classList.add('focused');
          chatInputEl.classList.add('morph-landed');
        }
        
        window.dispatchEvent(new CustomEvent('hero-morph-complete'));
      }, MORPH_DUR * 0.65);

      collapseAnim.onfinish = function () {
        vid.style.visibility = 'hidden';
        morphComplete = true;
        unlockScroll();
      };
    }

    function resetMorph() {
      if (collapseAnim) { collapseAnim.cancel(); collapseAnim = null; }
      isSnapping     = false;
      morphTriggered = false;
      morphComplete  = false;
      unlockScroll();
      vid.style.visibility   = '';
      vid.style.opacity      = '';
      vid.style.filter       = '';
      vid.style.borderRadius = '';
      vid.style.transform    = '';
      vid.style.boxShadow    = '';
      
      var chatInputEl = document.querySelector('.demo-chat-input');
      if (chatInputEl) {
        chatInputEl.classList.remove('focused');
        chatInputEl.classList.remove('morph-landed');
      }

      if (centerTextEl) {
        centerTextEl.style.transition = '';
        centerTextEl.style.opacity = '';
      }
      if (demoApp) {
        demoApp.classList.remove('expanded');
        demoApp.classList.add('collapsed');
      }
      window._heroMorphActive = false;
      window.dispatchEvent(new CustomEvent('hero-morph-reverse'));
    }

    /* ── Scroll handler ── */
    addScrollHandler(function () {
      var demoRect = demoSection.getBoundingClientRect();
      var vh = window.innerHeight;
      var demoVis = clamp(1 - demoRect.top / vh, 0, 1);

      if (morphTriggered) {
        if (demoVis < 0.3) resetMorph();
        return;
      }

      if (demoVis < SNAP_TRIGGER) {
        window._heroMorphActive = false;
        return;
      }

      if (!isSnapping) {
        snapToDemo();
      }

      if (demoVis >= MORPH_START) {
        window._heroMorphActive = true;
        var vw = window.innerWidth;
        
        var tgt = getTarget();

        var mp = clamp((demoVis - MORPH_START) / (1.0 - MORPH_START), 0, 1);
        var me = 1 - Math.pow(1 - mp, 2); 

        var targetScale = Math.max(tgt.width / vw, tgt.height / (vh - BOTTOM_GAP));

        curScale  = lerp(0.6, targetScale * 1.05, me);
        curTx     = 0;
        curTy     = 0;
        curRadius = lerp(12, 16, me);

        vid.style.transform    = 'translate(0px, 0px) scale(' + curScale + ')';
        vid.style.borderRadius = curRadius + 'px';
        vid.style.filter       = 'none';
        vid.style.opacity      = '1';
      }
    });
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

  /* ── Demo → Phone Entrance (trigger-based) + Products Carousel (scroll-driven) ── */
  function setupDemoToPhone() {
    if (window.innerWidth < 810) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var demoApp        = document.querySelector('.demo-app');
    var demoSection    = document.getElementById('demo');
    var productsSection = document.getElementById('features');
    var scrollContainer = document.getElementById('products-scroll');
    var device         = document.querySelector('.iphone-device');
    var phoneContainer = document.querySelector('.products-phone');
    var productsText   = document.querySelector('.products-text');
    var bgFader        = document.querySelector('.products-bg-fader');
    var heroClone      = document.querySelector('.feed-item-hero');
    var productsHeader = document.querySelector('.products-header');
    var productsLayout = document.querySelector('.products-layout');

    if (!demoApp || !demoSection || !productsSection || !scrollContainer || !device || !phoneContainer || !productsText) return;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // Hero visibility is controlled by is-active/is-prev like all feed items.
    // The whole phone is hidden via device translateY(200vh) until entrance.

    // ── Hide products UI until entrance triggers ──
    // The products section overlaps demo (margin-top: -240vh, z-index:3),
    // so without this the phone would be visible during demo scroll.
    device.style.transform = 'translateY(200vh)';
    if (bgFader) bgFader.style.opacity = '0';
    if (productsHeader) {
      productsHeader.style.opacity = '0';
      productsHeader.style.transform = 'translateY(20px)';
    }
    productsText.style.opacity = '0';
    productsText.style.transform = 'translateY(40px)';

    /* ── Scroll lock helpers ── */
    var lockHandler = function (e) { e.preventDefault(); };
    function lockScroll() {
      window.addEventListener('wheel', lockHandler, { passive: false });
      window.addEventListener('touchmove', lockHandler, { passive: false });
    }
    function unlockScroll() {
      window.removeEventListener('wheel', lockHandler);
      window.removeEventListener('touchmove', lockHandler);
    }

    /* ── Entrance state ── */
    var entranceTriggered = false;
    var entranceComplete  = false;
    var triggerScrollY    = 0; // scrollY when entrance fired
    var reverseCooldown   = false; // prevent re-trigger right after reverse
    var lastScrollY       = window.scrollY; // for scroll direction detection

    /* ── Trigger: detect when demo sticky zone is near its end ── */
    function checkTrigger() {
      if (entranceTriggered) return;
      if (reverseCooldown) return;

      // Only trigger when scrolling DOWN
      var currentY = window.scrollY;
      var scrollingDown = currentY > lastScrollY;
      lastScrollY = currentY;
      if (!scrollingDown) return;

      var demoRect = demoSection.getBoundingClientRect();
      var vh = window.innerHeight;
      if (demoRect.bottom <= vh * 1.3) {
        triggerEntrance();
      }
    }

    function triggerEntrance() {
      if (entranceTriggered) return;
      entranceTriggered = true;
      triggerScrollY = window.scrollY;
      lockScroll();

      // Start hero clone video playing
      var cloneVid = heroClone ? heroClone.querySelector('video') : null;
      if (cloneVid) cloneVid.play().catch(function(){});

      // Step 1: Snap-scroll to products section
      var targetY = productsSection.offsetTop;
      var startY  = window.scrollY;
      var diff    = targetY - startY;
      var snapDur = Math.min(600, Math.max(300, Math.abs(diff) * 0.3));
      var snapStart = performance.now();

      function snapTick(now) {
        var t = Math.min((now - snapStart) / snapDur, 1);
        var e = 1 - Math.pow(1 - t, 3); // ease-out cubic
        window.scrollTo(0, startY + diff * e);
        if (t < 1) {
          requestAnimationFrame(snapTick);
        } else {
          playEntrance();
        }
      }
      requestAnimationFrame(snapTick);
    }

    function playEntrance() {
      var vw = window.innerWidth;
      var vh = window.innerHeight;

      // Compute positions
      var pRect = phoneContainer.getBoundingClientRect();
      var devW  = device.offsetWidth;
      var natDevL    = pRect.left + (pRect.width - devW) / 2;
      var centerDevL = (vw - devW) / 2;
      var offsetTx   = centerDevL - natDevL;
      var SCALE_BIG  = 1.8;

      // Initial state: phone below viewport, centered, large
      device.style.transition = 'none';
      device.style.transform  = 'translate(' + offsetTx + 'px, ' + vh + 'px) scale(' + SCALE_BIG + ')';

      // Force reflow so initial state applies
      void device.offsetWidth;

      // ── Phase 1 (0ms): Demo fades out ──
      demoApp.style.transition = 'opacity 0.4s ease, transform 0.5s ease';
      demoApp.style.opacity = '0';
      demoApp.style.transform = 'scale(1.08)';
      demoApp.style.pointerEvents = 'none';

      // ── Phase 2 (100ms): Phone rises to center ──
      setTimeout(function() {
        device.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
        device.style.transform  = 'translate(' + offsetTx + 'px, 0px) scale(' + SCALE_BIG + ')';
      }, 100);

      // ── Phase 3 (1100ms): Hold, then phone slides left + shrinks ──
      setTimeout(function() {
        device.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
        device.style.transform  = 'translate(0px, 0px) scale(1)';
      }, 1100);

      // ── Phase 4 (1200ms): Background fades to white ──
      setTimeout(function() {
        if (bgFader) {
          bgFader.style.transition = 'opacity 0.6s ease';
          bgFader.style.opacity = '1';
        }
      }, 1200);

      // ── Phase 5 (1500ms): Header + text appear ──
      setTimeout(function() {
        if (productsHeader) {
          productsHeader.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          productsHeader.style.opacity   = '1';
          productsHeader.style.transform = 'translateY(0)';
        }
      }, 1500);

      setTimeout(function() {
        productsText.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        productsText.style.opacity   = '1';
        productsText.style.transform = 'translateY(0)';
      }, 1650);

      // ── Phase 6 (2200ms): Entrance complete, unlock scroll ──
      setTimeout(function() {
        entranceComplete = true;
        unlockScroll();
        // Clean up inline transitions so carousel scroll doesn't conflict
        device.style.transition = '';
      }, 2200);
    }

    /* ── Reverse entrance: phone flies back down, demo reappears ── */
    var reverseTriggered = false;

    function triggerReverse() {
      if (reverseTriggered) return;
      reverseTriggered = true;
      lockScroll();

      var vw = window.innerWidth;
      var vh = window.innerHeight;

      // Compute center offset (same math as playEntrance)
      var pRect = phoneContainer.getBoundingClientRect();
      var devW  = device.offsetWidth;
      var natDevL    = pRect.left + (pRect.width - devW) / 2;
      var centerDevL = (vw - devW) / 2;
      var offsetTx   = centerDevL - natDevL;
      var SCALE_BIG  = 1.8;

      // Phase 1 (T+0): Hide text + header + bg fades to dark
      productsText.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      productsText.style.opacity   = '0';
      productsText.style.transform = 'translateY(30px)';
      if (productsHeader) {
        productsHeader.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        productsHeader.style.opacity   = '0';
        productsHeader.style.transform = 'translateY(15px)';
      }
      if (bgFader) {
        bgFader.style.transition = 'opacity 0.35s ease';
        bgFader.style.opacity = '0';
      }

      // Phase 2 (T+100): Phone centers + grows (0.5s, finishes at T+600)
      setTimeout(function() {
        device.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        device.style.transform  = 'translate(' + offsetTx + 'px, 0px) scale(' + SCALE_BIG + ')';
      }, 100);

      // Phase 3 (T+620): Snap scroll (hidden behind big centered phone), then phone slides down
      setTimeout(function() {
        // Snap scroll while phone covers viewport
        window.scrollTo(0, triggerScrollY);

        // Start phone slide-down (no overlap with phase 2)
        void device.offsetWidth; // force reflow so new transition applies cleanly
        device.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 1, 1)';
        device.style.transform  = 'translate(' + offsetTx + 'px, ' + vh + 'px) scale(' + SCALE_BIG + ')';
      }, 620);

      // Phase 4 (T+700): Demo fades in (while phone slides away)
      setTimeout(function() {
        demoApp.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        demoApp.style.opacity = '1';
        demoApp.style.transform = 'scale(1)';
        demoApp.style.pointerEvents = '';
      }, 700);

      // Phase 5 (T+1250): All done, reset state
      setTimeout(function() {
        device.style.transition = 'none';
        device.style.transform  = 'translateY(200vh)';

        entranceTriggered = false;
        entranceComplete  = false;
        reverseTriggered  = false;
        currentIdx = 0;

        // Reset carousel feed items
        feedItems.forEach(function(item, i) {
          item.classList.remove('is-active', 'is-prev');
          if (i === 0) item.classList.add('is-active');
        });
        features.forEach(function(f, i) { f.classList.toggle('is-active', i === 0); });
        dots.forEach(function(d, i) { d.classList.toggle('active', i === 0); });

        unlockScroll();

        // Cooldown: prevent checkTrigger() from re-firing immediately
        reverseCooldown = true;
        lastScrollY = window.scrollY;
        setTimeout(function() { reverseCooldown = false; }, 600);
      }, 1250);
    }

    /* ── Carousel state ── */
    var features  = Array.from(document.querySelectorAll('.products-feature'));
    var feedItems = Array.from(document.querySelectorAll('.phone-feed .feed-item'));
    var dots      = Array.from(document.querySelectorAll('.progress-dot'));
    var heartsEl  = document.getElementById('products-hearts');
    var likeEl    = document.getElementById('products-like-count');
    var danmakuEl = document.getElementById('products-danmaku');
    var hintEl    = document.getElementById('products-scroll-hint');
    var totalSteps = features.length;
    var currentIdx = 0;

    var likeCounts = [246000, 382000, 518000];
    var commentSets = [
      ['This AI is unbelievable!', 'So natural!', 'Can\'t wait to try it'],
      ['The cinematography is insane', 'Director mode is fire', 'Bookmarked!'],
      ['One-click export?', 'The future is here', 'Game changer']
    ];
    function formatCount(n) { return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString(); }

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

    function setStep(newIdx) {
      if (newIdx === currentIdx) return;
      currentIdx = newIdx;
      features.forEach(function(f, i) { f.classList.toggle('is-active', i === newIdx); });
      feedItems.forEach(function(item, i) {
        item.classList.remove('is-active', 'is-prev');
        var vid = item.querySelector('video');
        if (i === newIdx) {
          item.classList.add('is-active');
          if (vid) { vid.currentTime = 0; vid.play().catch(function(){}); }
        } else if (i < newIdx) {
          item.classList.add('is-prev');
          if (vid) vid.pause();
        } else {
          if (vid) vid.pause();
        }
      });
      if (heartsEl) spawnHearts(heartsEl, 6);
      if (likeEl) {
        likeEl.textContent = formatCount(likeCounts[newIdx] || 0);
        likeEl.classList.remove('like-bump');
        void likeEl.offsetWidth;
        likeEl.classList.add('like-bump');
      }
      var msgs = commentSets[newIdx] || [];
      msgs.forEach(function(msg, i) {
        if (danmakuEl) setTimeout(spawnComment.bind(null, danmakuEl, msg), i * 800);
      });
      dots.forEach(function(d, i) { d.classList.toggle('active', i === newIdx); });
    }

    /* ── Scroll handler: trigger detection + carousel ── */
    addScrollHandler(function () {
      // Check for entrance trigger
      if (!entranceTriggered) {
        checkTrigger();
        return;
      }

      // Block carousel changes during reverse animation
      if (!entranceComplete || reverseTriggered) return;

      var rect = scrollContainer.getBoundingClientRect();
      var scrollDistance = rect.height - window.innerHeight;
      if (scrollDistance <= 0) return;
      var progress = clamp(-rect.top / scrollDistance, 0, 1);
      var newIdx = Math.min(Math.floor(progress * totalSteps), totalSteps - 1);

      // Reverse: at first video and scrolled above products-scroll top
      // Check BEFORE setStep to avoid video 2 flashing during transition
      if (newIdx === 0 && rect.top > 0) {
        triggerReverse();
        return;
      }

      setStep(newIdx);

      if (hintEl) hintEl.style.opacity = progress < 0.1 ? '1' : '0';
    });

    // Ambient hearts
    var ambientTimer = null;
    var heartsIO = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !ambientTimer) {
          ambientTimer = setInterval(function() {
            if (heartsEl) spawnHearts(heartsEl, 2);
          }, 5000);
        } else if (!e.isIntersecting && ambientTimer) {
          clearInterval(ambientTimer);
          ambientTimer = null;
        }
      });
    }, { threshold: 0.1 });
    heartsIO.observe(scrollContainer);
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

  /* ── Cinematic Hero Snap (instant cinema cut) ────────────── */
  function setupCineHeroSnap() {
    if (window.innerWidth < 810) return;

    var productsScroll = document.getElementById('products-scroll');
    var cineSection = document.querySelector('.cine-hero');
    if (!productsScroll || !cineSection) return;

    var snappedForward = false;
    var cooldown = false;
    var BUFFER = 50; // dead-zone buffer to prevent snap loops

    addScrollHandler(function () {
        if (cooldown) return;

        var scrollY = window.scrollY;
        var pRect = productsScroll.getBoundingClientRect();
        var productsEnd = pRect.bottom + scrollY; // document-relative bottom
        var cineTop = cineSection.getBoundingClientRect().top + scrollY;

        if (!snappedForward) {
          // Forward snap: products scroll runway fully consumed
          if (scrollY >= productsEnd - window.innerHeight + BUFFER) {
            snappedForward = true;
            cooldown = true;
            window.scrollTo({ top: cineTop, behavior: 'instant' });
            setTimeout(function () { cooldown = false; }, 200);
          }
        } else {
          // Backward snap: scrolled above cinematic section top
          if (scrollY < cineTop) {
            snappedForward = false;
            cooldown = true;
            // Land well before the forward-snap threshold to avoid re-triggering
            window.scrollTo({ top: productsEnd - window.innerHeight - BUFFER, behavior: 'instant' });
            setTimeout(function () { cooldown = false; }, 200);
          }
        }
      });
  }

  /* ── Cinematic Hero Scroll-Shrink ─────────────────────────── */
  function setupCineHeroShrink() {
    if (window.innerWidth < 810) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var section = document.querySelector('.cine-hero');
    var frame   = document.querySelector('.cine-hero-frame');
    var video   = document.querySelector('.cine-hero-vid');
    var title   = document.querySelector('.cine-hero-title');
    if (!section || !frame || !video) return;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    var FINAL_W = 918;
    var FINAL_H = 459;
    var FINAL_R = 20;
    var DEAD_ZONE = 0.05;
    var SHRINK_END = 0.25;  // shrink completes at 25%
    var FADE_START = 0.55;  // fade starts at 55% — long pause after shrink
    var FADE_END = 0.62;    // fade ends
    var waitingToFreeze = false;
    var frozen = false;

    // Freeze when video finishes its current playthrough
    video.addEventListener('ended', function () {
      if (waitingToFreeze) {
        frozen = true;
        video.pause();
      }
    });

    addScrollHandler(function () {
        var rect = section.getBoundingClientRect();
        var scrollDistance = rect.height - window.innerHeight;
        if (scrollDistance <= 0) return;

        var progress = clamp(-rect.top / scrollDistance, 0, 1);

        // Remap: DEAD_ZONE–SHRINK_END = full shrink
        var shrinkT = clamp((progress - DEAD_ZONE) / (SHRINK_END - DEAD_ZONE), 0, 1);
        var e = ease(shrinkT);

        // Interpolate frame dimensions
        var w = lerp(window.innerWidth, Math.min(FINAL_W, window.innerWidth * 0.9), e);
        var h = lerp(window.innerHeight, FINAL_H, e);
        var r = lerp(0, FINAL_R, e);

        frame.style.width        = w + 'px';
        frame.style.height       = h + 'px';
        frame.style.borderRadius = r + 'px';

        // Title fade in during shrink
        if (title) {
          var titleProgress = clamp((progress - 0.15) / 0.2, 0, 1);
          title.style.opacity = titleProgress;
        }

        // Fade out cine-hero frame
        if (progress >= FADE_START) {
          var fadeT = clamp((progress - FADE_START) / (FADE_END - FADE_START), 0, 1);
          frame.style.opacity = 1 - fadeT;
        } else {
          frame.style.opacity = 1;
        }

        // Freeze: wait for video to finish its current playthrough
        if (progress >= 1 && !frozen && !waitingToFreeze) {
          waitingToFreeze = true;
          video.loop = false; // let current playthrough end naturally
        } else if (progress < 1 && (frozen || waitingToFreeze)) {
          waitingToFreeze = false;
          frozen = false;
          video.loop = true;
          video.play().catch(function () {});
        }
      });
  }

  /* ── Research Section Reveal ──────────────────────────────── */
  function setupResearchReveal() {
    var section = document.querySelector('.research');
    if (!section) return;

    var label    = section.querySelector('.section-label');
    var title    = section.querySelector('.section-title');
    var subtitle = section.querySelector('.section-subtitle');
    var items    = section.querySelectorAll('.research-item');

    // Initial hidden state
    var targets = [];
    if (label) { label.style.opacity = '0'; label.style.transform = 'translateY(24px)'; targets.push(label); }
    if (title) { title.style.opacity = '0'; title.style.transform = 'translateY(32px)'; targets.push(title); }
    if (subtitle) { subtitle.style.opacity = '0'; subtitle.style.transform = 'translateY(24px)'; targets.push(subtitle); }
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

  /* ── Drag Surface (heavy damping) ────────────────────────── */
  function setupDragSurface() {
    var surface = document.getElementById('drag-surface');
    var canvas  = document.getElementById('drag-canvas');
    if (!surface || !canvas) return;

    var isDragging = false;
    var startX = 0, startY = 0;
    var offsetX = 0, offsetY = 0;    // canvas pos when drag began
    var targetX = 0, targetY = 0;    // where the canvas wants to be
    var currentX = 0, currentY = 0;  // where the canvas actually is
    var animFrame = 0;

    var DRAG_EASE = 0.10;  // lower = heavier (canvas lerps toward target each frame)

    function tick() {
      var dx = targetX - currentX;
      var dy = targetY - currentY;
      // Settled — stop loop
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && !isDragging) {
        currentX = targetX;
        currentY = targetY;
        canvas.style.transform = 'translate(' + currentX + 'px,' + currentY + 'px)';
        animFrame = 0;
        return;
      }
      currentX += dx * DRAG_EASE;
      currentY += dy * DRAG_EASE;
      canvas.style.transform = 'translate(' + currentX + 'px,' + currentY + 'px)';
      animFrame = requestAnimationFrame(tick);
    }

    function ensureTicking() {
      if (!animFrame) animFrame = requestAnimationFrame(tick);
    }

    function onStart(x, y) {
      isDragging = true;
      startX = x;
      startY = y;
      offsetX = currentX;
      offsetY = currentY;
      surface.classList.add('is-dragging');
      ensureTicking();
    }

    function onMove(x, y) {
      if (!isDragging) return;
      targetX = offsetX + (x - startX);
      targetY = offsetY + (y - startY);
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      surface.classList.remove('is-dragging');
      // No momentum — just settle to final target
      ensureTicking();
    }

    // Mouse events — listeners are attached only while dragging to avoid
    // firing onMove on every mouse movement across the whole page.
    function onMouseMove(e) { onMove(e.clientX, e.clientY); }
    function onMouseUp() {
      onEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    surface.addEventListener('mousedown', function (e) {
      if (e.target.closest('.drag-cta')) return;
      e.preventDefault();
      onStart(e.clientX, e.clientY);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Touch events
    surface.addEventListener('touchstart', function (e) {
      if (e.target.closest('.drag-cta')) return;
      var t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    surface.addEventListener('touchmove', function (e) {
      if (!isDragging) return;
      e.preventDefault();
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: false });
    surface.addEventListener('touchend', onEnd);

    // Video hover play/pause
    canvas.querySelectorAll('.drag-card').forEach(function (card) {
      var vid = card.querySelector('video');
      if (!vid) return;
      card.addEventListener('mouseenter', function () {
        vid.play().catch(function () {});
      });
      card.addEventListener('mouseleave', function () {
        vid.pause();
      });
    });

    // Show badge
    surface.classList.add('is-active');
  }

  /* ── Lazy video play/pause via IntersectionObserver ────────── */
  function setupLazyVideos() {
    document.querySelectorAll('video[data-lazy]').forEach(function (video) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.play().catch(function () {});
          } else {
            e.target.pause();
          }
        });
      }, { threshold: 0.1 }).observe(video);
    });
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    // Phone feed
    var feedEl = document.getElementById('phone-feed');
    if (feedEl) {
      new PhoneFeed(feedEl);
    }

    setupLazyVideos();
    setupTextVideoMask();
    setupFpIndicator();
    setupHeroShrink();
    setupHeroDemoMorph();
    setupDemoToPhone();
    setupIphoneEnter();
    setupCineHeroSnap();
    setupCineHeroShrink();
    setupResearchReveal();
    setupDragSurface();
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

    addScrollHandler(updateBtn);
    updateBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
