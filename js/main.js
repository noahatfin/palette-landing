/* ============================================================
   NOON.CO — main.js
   Nav scroll · Mobile toggle · Reveal · Counter · FAQ
   ============================================================ */
(function () {
  'use strict';

  /* ── Nav: scrolled state + theme swap ────────────────── */
  var nav = document.getElementById('nav');
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
    if (typeof window._paletteUpdateNavTheme === 'function') {
      window._paletteUpdateNavTheme();
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile hamburger ─────────────────────────────────── */
  var burger = document.getElementById('nav-burger');
  var drawer = document.getElementById('nav-drawer');

  burger.addEventListener('click', function () {
    var open = drawer.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeDrawer);
  });

  document.addEventListener('click', function (e) {
    if (drawer.classList.contains('open') &&
        !drawer.contains(e.target) && !burger.contains(e.target)) {
      closeDrawer();
    }
  });

  function closeDrawer() {
    drawer.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* ── IntersectionObserver: scroll reveal ──────────────── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(function (el) {
    io.observe(el);
  });

  // Hero reveals immediately on load
  requestAnimationFrame(function () {
    document.querySelectorAll('.hero .reveal').forEach(function (el) {
      el.classList.add('in');
    });
  });

  /* ── Smooth scroll ────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        closeDrawer();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Number counters ──────────────────────────────────── */
  var counters = document.querySelectorAll('.counter');
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = parseInt(el.getAttribute('data-target'), 10);
      counterObserver.unobserve(el);

      if (target === 0) {
        el.textContent = '0';
        return;
      }

      var start = 0;
      var duration = 1400; // ms
      var startTime = null;

      function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
      }

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var current = Math.round(easeOutQuart(progress) * target);
        el.textContent = current;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target;
        }
      }

      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });

  counters.forEach(function (c) {
    counterObserver.observe(c);
  });

  /* ── FAQ accordion ────────────────────────────────────── */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      toggleFaq(this.closest('.faq-item'));
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFaq(this.closest('.faq-item'));
      }
    });
  });

  function toggleFaq(item) {
    var isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
      openItem.classList.remove('open');
      openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add('open');
      item.querySelector('.faq-question').setAttribute('aria-expanded', 'true');
    }
  }

  /* ── Contact form ─────────────────────────────────────── */
  var form = document.getElementById('contact-form');
  var successMsg = document.getElementById('form-success');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('c-email');
      if (!email || !email.value.includes('@')) {
        email.focus();
        return;
      }
      form.style.display = 'none';
      successMsg.classList.add('show');
    });
  }

})();
