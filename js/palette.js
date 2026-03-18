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
    var hasMerged = false;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    var MORPH_START = 0.85;
    var MORPH_END = 1.0;
    var morphComplete = false;
    var chatInput = document.querySelector('.demo-chat-input');
    var demoApp = document.querySelector('.demo-app');

    // Exponential easing: almost nothing until 0.7, then rockets to 1
    function morphEase(t) {
      return Math.pow(t, 4); // t^4 gives dramatic non-linear curve
    }

    // scrollEnd: the hero zone is 300vh, so the scroll distance for the hero animation
    // is 2 viewports (300vh - 100vh sticky = 200vh of scroll)
    var scrollEnd = window.innerHeight * 2;

    addScrollHandler(function () {
        var scrollY = window.scrollY;

        // ── HERO (scroll-driven) ─────────────────────────────────
        var p = clamp(scrollY / scrollEnd, 0, 1);
        var e  = ease(p);

        // Scale down the video as user scrolls
        if (!isMobile) {
          if (p >= MORPH_START && chatInput) {
            // ── MORPH PHASE: non-linear snap into chat input ──
            var mp = clamp((p - MORPH_START) / (MORPH_END - MORPH_START), 0, 1);
            var me = morphEase(mp);

            // Get chat input position (relative to viewport since vid is fixed)
            var targetRect = chatInput.getBoundingClientRect();
            var vw = window.innerWidth;
            var vh = window.innerHeight;

            // Start state: current scaled video (scale 0.6 from normal easing at p=0.85)
            // End state: chat input bar dimensions and position
            var startScale = lerp(1, 0.6, ease(MORPH_START));
            var startRadius = lerp(0, 12, ease(MORPH_START));

            // Target dimensions relative to viewport
            var endW = targetRect.width;
            var endH = targetRect.height;
            var endCX = targetRect.left + endW / 2;
            var endCY = targetRect.top + endH / 2;

            // Video starts at center of viewport (minus bottom gap)
            var startCX = vw / 2;
            var startCY = vh / 2;

            // Interpolate scale (from startScale to tiny)
            var endScaleX = endW / vw;
            var endScaleY = endH / vh;
            var scaleX = lerp(startScale, endScaleX, me);
            var scaleY = lerp(startScale, endScaleY, me);

            // Interpolate position
            var tx = lerp(0, endCX - startCX, me);
            var ty = lerp(0, endCY - startCY, me);

            // Interpolate border-radius (scale-compensated)
            var endRadius = 12; // chat input border-radius
            var radius = lerp(startRadius, endRadius / Math.min(scaleX, scaleY), me);

            vid.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scaleX + ',' + scaleY + ')';
            vid.style.borderRadius = radius + 'px';
            vid.style.opacity = lerp(1, 0.7, me);

            // At completion: hide video, mark chat input
            if (mp >= 0.97 && !morphComplete) {
              morphComplete = true;
              vid.style.visibility = 'hidden';
              chatInput.classList.add('morph-landed');
              // Dispatch custom event for demo.js to pick up
              window.dispatchEvent(new CustomEvent('hero-morph-complete'));
            }
          } else {
            // ── NORMAL PHASE: gentle scale down ──
            var scale = lerp(1, 0.6, e);
            vid.style.transform = 'scale(' + scale + ')';
            vid.style.borderRadius = lerp(0, 12, e) + 'px';
            vid.style.opacity = '';

            // Reverse morph if scrolled back
            if (morphComplete) {
              morphComplete = false;
              vid.style.visibility = '';
              if (chatInput) chatInput.classList.remove('morph-landed');
              if (demoApp) {
                demoApp.classList.remove('expanded');
                demoApp.classList.add('collapsed');
              }
              window.dispatchEvent(new CustomEvent('hero-morph-reverse'));
            }
          }
        }

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

    // Mission text merge: overlay → real text seamless handoff
    var missionText = document.querySelector('.mission-text');

    if (isMobile && missionText) {
      // Mobile: no center overlay, just show mission text directly
      missionText.style.opacity = '1';
      missionText.style.color = '';
      missionText.style.textShadow = '';
      missionText.classList.add('is-revealed');
    }

    addScrollHandler(function () {
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

    var isMobileProducts = window.innerWidth < 810;
    var featureVids = isMobileProducts ? Array.from(document.querySelectorAll('.products-feature-vid video')) : [];

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

    // Hero video is the first "feed" in the phone.
    // feedItems (from .phone-feed) are only the 2nd and 3rd videos.
    var heroVid = document.querySelector('.hero-vid');

    function setStep(newIdx) {
      if (newIdx === currentIdx) return;
      currentIdx = newIdx;

      // Text crossfade (works on both mobile and desktop)
      features.forEach(function(f, i) {
        f.classList.toggle('is-active', i === newIdx);
      });

      if (isMobileProducts) {
        // Mobile: hero video is in the phone at step 0, slide it away for other steps
        if (heroVid) {
          heroVid.style.transition = 'transform 0.55s cubic-bezier(0.22, 0.68, 0, 1)';
          heroVid.style.transform = newIdx === 0 ? '' : 'translateY(-100%)';
        }
        // Feed items: feedItems[0] = step 1, feedItems[1] = step 2 (same as desktop)
        feedItems.forEach(function(item, i) {
          var stepIdx = i + 1;
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
      } else {
        // Desktop: phone feed — hero video = step 0, feedItems[0] = step 1, feedItems[1] = step 2
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
          var stepIdx = i + 1;
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

      // Progress dots
      dots.forEach(function(d, i) {
        d.classList.toggle('active', i === newIdx);
      });
    }

    // Scroll handler
    addScrollHandler(function() {
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

    // Ambient hearts — only run while section is visible
    var ambientHeartsTimer = null;
    var heartsIO = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !ambientHeartsTimer) {
          ambientHeartsTimer = setInterval(function() {
            if (heartsEl && currentIdx >= 0) spawnHearts(heartsEl, 2);
          }, 5000);
        } else if (!e.isIntersecting && ambientHeartsTimer) {
          clearInterval(ambientHeartsTimer);
          ambientHeartsTimer = null;
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
    setupIphoneEnter();
    setupProductsScroll();
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
