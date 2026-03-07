(function () {
  'use strict';

  function init() {
    // Mark active nav link based on current page
    var path = window.location.pathname.replace(/\/$/, '').replace(/\.html$/, '') || '/';
    var links = document.querySelectorAll('.nav-links a');
    links.forEach(function (link) {
      var href = link.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '') || '/';
      if (path === href || (path === '' && href === '/') || path.endsWith(href)) {
        link.classList.add('active');
      }
    });

    // Mobile menu toggle
    var toggle = document.querySelector('.nav-toggle');
    var mobileNav = document.querySelector('.nav-mobile');

    if (toggle && mobileNav) {
      toggle.addEventListener('click', function () {
        var isOpen = mobileNav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);

        // Animate hamburger → X
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

      // Close on link click
      mobileNav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          mobileNav.classList.remove('open');
          var spans = toggle.querySelectorAll('span');
          spans[0].style.transform = '';
          spans[1].style.opacity = '';
          spans[2].style.transform = '';
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
