(function () {
  'use strict';

  function init() {
    var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    var mobileLinks = document.querySelectorAll('.nav-mobile a[href^="#"]');

    // Smooth-scroll on nav link click
    function handleNavClick(e) {
      var href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        // Close mobile nav if open
        closeMobileNav();
      }
    }

    navLinks.forEach(function (a) { a.addEventListener('click', handleNavClick); });
    mobileLinks.forEach(function (a) { a.addEventListener('click', handleNavClick); });

    // Intersection Observer — update active link based on scroll position
    var sections = document.querySelectorAll('section[id]');

    if (sections.length > 0 && navLinks.length > 0) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (a) {
              var wasActive = a.classList.contains('active');
              var isNowActive = a.getAttribute('href') === '#' + id;
              if (isNowActive && !wasActive) {
                a.classList.add('active');
              } else if (!isNowActive) {
                a.classList.remove('active');
              }
            });
          }
        });
      }, { threshold: 0.35, rootMargin: '-64px 0px 0px 0px' });

      sections.forEach(function (s) { observer.observe(s); });
    } else {
      // Fallback for standalone pages: mark active by pathname
      var path = window.location.pathname.replace(/\/$/, '').replace(/\.html$/, '') || '/';
      document.querySelectorAll('.nav-links a').forEach(function (link) {
        var href = link.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '') || '/';
        if (path === href || (path === '' && href === '/') || path.endsWith(href)) {
          link.classList.add('active');
        }
      });
    }

    // Mobile menu toggle
    var toggle = document.querySelector('.nav-toggle');
    var mobileNav = document.querySelector('.nav-mobile');

    function closeMobileNav() {
      if (!mobileNav) return;
      mobileNav.classList.remove('open');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        var spans = toggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    }

    if (toggle && mobileNav) {
      toggle.addEventListener('click', function () {
        var isOpen = mobileNav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        var spans = toggle.querySelectorAll('span');
        if (isOpen) {
          spans[0].style.transform = 'translateY(7px) rotate(45deg)';
          spans[1].style.opacity = '0';
          spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
        } else {
          spans[0].style.transform = '';
          spans[1].style.opacity = '';
          spans[2].style.transform = '';
        }
      });

      // Close on non-hash link click too
      mobileNav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeMobileNav);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
