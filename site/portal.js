/**
 * 门户页交互：
 * 1. 用真实的 timer.html 渲染计时器预览（缩放、不可聚焦的 iframe）
 * 2. 主题切换时重新加载真实计时页
 * 3. 滚动入场、导航状态
 */
(function () {
  'use strict';

  var TIMER_BASE_WIDTH = 1600;

  initTimerFrames();
  initThemePicker();
  initReveal();
  initNav();

  /* ------------------------------------------------------------------ */
  /* 真实计时页 iframe                                                   */
  /* ------------------------------------------------------------------ */

  function initTimerFrames() {
    var frames = Array.prototype.slice.call(document.querySelectorAll('[data-timer-frame]'));

    frames.forEach(function (frame) {
      var src = frame.getAttribute('data-src');
      if (!src) return;

      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = frame.getAttribute('data-title') || '计时器实时渲染预览';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('tabindex', '-1');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('inert', '');
      iframe.setAttribute('loading', frame.classList.contains('timer-frame--hero') ? 'eager' : 'lazy');
      frame.appendChild(iframe);
      frame.__timerIframe = iframe;

      scaleFrame(frame);
      observeFrame(frame);
    });

    window.addEventListener('resize', function () {
      frames.forEach(scaleFrame);
    });
  }

  function observeFrame(frame) {
    if (typeof ResizeObserver !== 'function') return;
    var observer = new ResizeObserver(function () {
      scaleFrame(frame);
    });
    observer.observe(frame);
  }

  function scaleFrame(frame) {
    var width = frame.clientWidth;
    if (!width) return;
    var scale = width / TIMER_BASE_WIDTH;
    frame.style.setProperty('--timer-scale', String(scale));
  }

  function loadFrame(frame, src) {
    if (!frame) return;
    frame.setAttribute('data-src', src);
    if (frame.__timerIframe) {
      frame.__timerIframe.src = src;
    }
    scaleFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* 主题切换                                                            */
  /* ------------------------------------------------------------------ */

  function initThemePicker() {
    var frame = document.querySelector('[data-theme-frame]');
    var picker = document.querySelector('.theme-picker');
    if (!frame || !picker) return;

    var buttons = Array.prototype.slice.call(picker.querySelectorAll('button[data-preset]'));

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var preset = button.getAttribute('data-preset');
        var src = 'timer.html?embed=1&seg=dual&time=167&preset=' + encodeURIComponent(preset);
        loadFrame(frame, src);
        frame.animate(
          [
            { opacity: 0.6, transform: 'translateY(6px) scale(0.995)' },
            { opacity: 1, transform: 'none' }
          ],
          { duration: 420, easing: 'cubic-bezier(0.16,1,0.3,1)' }
        );
        buttons.forEach(function (item) {
          item.classList.toggle('on', item === button);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 滚动入场                                                            */
  /* ------------------------------------------------------------------ */

  function initReveal() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (item) {
        item.classList.add('in');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach(function (item) {
      observer.observe(item);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 导航状态                                                            */
  /* ------------------------------------------------------------------ */

  function initNav() {
    var nav = document.getElementById('nav');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
    var sections = links
      .map(function (link) {
        return document.querySelector(link.getAttribute('href'));
      })
      .filter(Boolean);

    function onScroll() {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);

      var current = null;
      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top < window.innerHeight * 0.4) {
          current = section.id;
        }
      });

      links.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
