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

  /* ── Hero Scroll Shrink ─────────────────────────────────────
     Hero zone = 160vh (60vh scroll runway).
     Video shrinks non-linearly (t³), keeping its cinema aspect ratio.
     Near the bottom it's a small rounded rectangle. Then it quickly
     cross-fades into the Demo's centered shimmer input box — feels
     like the video "lands" into the input.

     Scroll map (60vh runway):
       0–8%    text + overlay fade out, 80px bottom gap closes
       0–100%  non-linear shrink (t³): full-screen → ~550×140 rounded card
       88–100% video opacity → 0, demo input shimmer visible beneath
  ──────────────────────────────────────────────────────────── */
  function setupHeroShrink() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 810) return;

    var vid = document.querySelector('.hero-vid');
    var heroSection = document.querySelector('.hero.hero-zone');
    var content = document.querySelector('.hero-content');
    var overlay = document.querySelector('.hero-overlay');
    var centerText = document.querySelector('.hero-center-text');
    var demoApp = document.querySelector('.demo-app');
    var demoChatInput = document.querySelector('.demo-chat-input');
    if (!vid || !heroSection || !demoApp || !demoChatInput) return;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    var TEXT_FADE = 0.08;
    var XFADE_START = 0.88;
    var XFADE_END = 1.0;

    // Get initial dimensions of the video (full screen)
    var initialVidWidth = window.innerWidth;
    var initialVidHeight = window.innerHeight;

    // Get target dimensions and position of demoChatInput (relative to viewport)
    // This needs to be done once, but after demo.js has potentially set up demo-intro
    // To get the correct target position, we need to ensure demoApp is in its 'demo-intro' state
    // temporarily to measure.
    demoApp.classList.add('demo-intro'); // Apply demo-intro to get correct target rect
    var targetRect = demoChatInput.getBoundingClientRect();
    demoApp.classList.remove('demo-intro'); // Remove it immediately after measurement

    var LAND_W = targetRect.width;
    var LAND_H = targetRect.height;
    var LAND_R = 16; // From .demo-chat-bar border-radius

    var targetLeft = targetRect.left;
    var targetTop = targetRect.top;

    // Store initial video styles to restore later
    var originalVidStyles = {
      position: vid.style.position,
      top: vid.style.top,
      left: vid.style.left,
      width: vid.style.width,
      height: vid.style.height,
      transform: vid.style.transform,
      borderRadius: vid.style.borderRadius,
      opacity: vid.style.opacity,
      pointerEvents: vid.style.pointerEvents
    };

    // Initial setup for demoChatInput
    demoChatInput.style.opacity = 0;
    demoChatInput.style.transition = 'opacity 0.2s ease-out'; // Add transition for smooth fade-in

    addScrollHandler(function () {
      var rect = heroSection.getBoundingClientRect();
      var scrollDist = rect.height - window.innerHeight;
      if (scrollDist <= 0) { // After the animation zone
        // Ensure final states are correct and restore video styles
        vid.style.opacity = 0;
        vid.style.pointerEvents = 'none';
        vid.style.position = originalVidStyles.position;
        vid.style.top = originalVidStyles.top;
        vid.style.left = originalVidStyles.left;
        vid.style.width = originalVidStyles.width;
        vid.style.height = originalVidStyles.height;
        vid.style.transform = originalVidStyles.transform;
        vid.style.borderRadius = originalVidStyles.borderRadius;

        demoChatInput.style.opacity = 1;
        demoApp.classList.remove('demo-intro'); // Let demo.js take over
        return;
      }

      var progress = clamp(-rect.top / scrollDist, 0, 1);

      /* ── Text fade-out ── */
      var textAlpha = 1 - clamp(progress / TEXT_FADE, 0, 1);
      if (content) {
        content.style.opacity = textAlpha;
        content.style.pointerEvents = textAlpha < 0.1 ? 'none' : '';
      }
      if (centerText) centerText.style.opacity = textAlpha;
      if (overlay)    overlay.style.opacity = textAlpha;

      /* ── Video positioning and scaling ── */
      // Temporarily make video fixed to control its position relative to viewport
      vid.style.position = 'fixed';
      vid.style.top = '0';
      vid.style.left = '0';
      vid.style.width = '100%';
      vid.style.height = '100%';

      // Calculate current scale and position
      var currentScaleX = lerp(1, LAND_W / initialVidWidth, progress);
      var currentScaleY = lerp(1, LAND_H / initialVidHeight, progress);
      var currentRadius = lerp(0, LAND_R, progress);

      var currentLeft = lerp(0, targetLeft, progress);
      var currentTop = lerp(0, targetTop, progress);

      vid.style.transformOrigin = 'top left'; // Change origin for easier positioning
      vid.style.transform = 'translate(' + currentLeft + 'px, ' + currentTop + 'px) scale(' + currentScaleX + ', ' + currentScaleY + ')';
      vid.style.borderRadius = currentRadius + 'px';
      vid.style.pointerEvents = '';

      /* ── Crossfade & land: video → demo chat input ── */
      var fadeProgress = clamp((progress - XFADE_START) / (XFADE_END - XFADE_START), 0, 1);
      
      vid.style.opacity = 1 - fadeProgress;
      demoChatInput.style.opacity = fadeProgress;

      // Ensure demoApp has demo-intro class during the transition
      if (progress > XFADE_START && progress < XFADE_END) {
        demoApp.classList.add('demo-intro');
      } else if (progress >= XFADE_END) {
        demoApp.classList.remove('demo-intro');
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

    // Hero video reference for step 0 in the phone feed.
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
    var FADE_START = 0.55;  // crossfade starts at 55% — long pause after shrink
    var FADE_END = 0.62;    // crossfade ends
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

        // Crossfade: cine-hero fades out, demo fades in
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
    setupChatAnimation();
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
