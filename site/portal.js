/**
 * 门户页交互：
 * 1. 真实运行的小型计时引擎（与桌面端一致的呈现规则）
 * 2. 主题令牌实时预览
 * 3. 滚动入场、导航状态、章节高亮
 */
(function () {
  'use strict';

  var SEGMENTS = [
    { name: '开场', type: 'none', duration: 0, side: 'neutral' },
    { name: '双方介绍', type: 'none', duration: 0, side: 'neutral' },
    { name: '正方一辩 · 立论陈词', type: 'speech', duration: 180, side: 'aff' },
    { name: '反方一辩 · 立论陈词', type: 'speech', duration: 180, side: 'neg' },
    { name: '反方四辩 · 质询 · 正方一辩', type: 'question', duration: 90, side: 'neg' },
    { name: '正方四辩 · 质询 · 反方一辩', type: 'question', duration: 90, side: 'aff' },
    { name: '正方二辩 · 申论', type: 'speech', duration: 120, side: 'aff' },
    { name: '反方二辩 · 申论', type: 'speech', duration: 120, side: 'neg' },
    { name: '正方三辩 · 质询 · 反方二辩', type: 'question', duration: 120, side: 'aff' },
    { name: '反方三辩 · 质询 · 正方二辩', type: 'question', duration: 120, side: 'neg' },
    { name: '正方三辩 · 质询小结', type: 'speech', duration: 150, side: 'aff' },
    { name: '反方三辩 · 质询小结', type: 'speech', duration: 150, side: 'neg' },
    { name: '自由辩论', type: 'dual', duration: 240, side: 'dual' },
    { name: '反方四辩 · 总结陈词', type: 'speech', duration: 180, side: 'neg' },
    { name: '正方四辩 · 总结陈词', type: 'speech', duration: 180, side: 'aff' },
    { name: '评委点评', type: 'none', duration: 0, side: 'neutral' }
  ];

  var SCENARIOS = { speech: 2, question: 4, dual: 12 };

  var stage = document.getElementById('stage');
  if (stage) {
    initStage(stage);
  }

  initThemePicker();
  initReveal();
  initNav();

  /* ------------------------------------------------------------------ */
  /* 计时演示                                                            */
  /* ------------------------------------------------------------------ */

  function initStage(root) {
    var el = {
      seg: root.querySelector('[data-seg]'),
      time: root.querySelector('[data-time]'),
      hold: root.querySelector('[data-hold]'),
      dual: root.querySelector('[data-dual]'),
      dualAff: root.querySelector('[data-dual-aff]'),
      dualNeg: root.querySelector('[data-dual-neg]'),
      dualAffCol: root.querySelector('[data-dual-aff-col]'),
      dualNegCol: root.querySelector('[data-dual-neg-col]'),
      track: root.querySelector('[data-track]'),
      bar: root.querySelector('[data-bar]'),
      side: root.querySelector('[data-side]'),
      sideText: root.querySelector('[data-side-text]'),
      rail: root.querySelector('[data-rail]'),
      toggle: root.querySelector('[data-action="toggle"]'),
      toggleLabel: root.querySelector('[data-toggle-label]'),
      reset: root.querySelector('[data-action="reset"]'),
      scenarioButtons: Array.prototype.slice.call(root.querySelectorAll('[data-scenario]'))
    };

    var state = {
      index: SCENARIOS.speech,
      remaining: SEGMENTS[SCENARIOS.speech].duration,
      remainingAff: 0,
      remainingNeg: 0,
      active: 'aff',
      running: false,
      last: 0,
      raf: 0
    };

    buildRail();
    select(state.index);
    render();

    el.toggle.addEventListener('click', toggle);
    el.reset.addEventListener('click', function () {
      select(state.index);
    });

    el.scenarioButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-scenario');
        if (typeof SCENARIOS[key] !== 'number') return;
        el.scenarioButtons.forEach(function (item) {
          item.classList.toggle('on', item === button);
        });
        select(SCENARIOS[key]);
      });
    });

    root.addEventListener('pointerdown', function (event) {
      if (event.target.closest('button')) return;
      root.focus({ preventScroll: true });
    });

    root.addEventListener('keydown', function (event) {
      if (event.code === 'Space') {
        event.preventDefault();
        if (SEGMENTS[state.index].type === 'dual' && state.running) {
          state.active = state.active === 'aff' ? 'neg' : 'aff';
          render();
        } else {
          toggle();
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        select(Math.min(SEGMENTS.length - 1, state.index + 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        select(Math.max(0, state.index - 1));
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        select(state.index);
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.running) {
        pause();
      }
    });

    function buildRail() {
      if (!el.rail) return;
      SEGMENTS.forEach(function (segment, index) {
        var li = document.createElement('li');
        li.textContent = segment.name;
        li.title = segment.name;
        li.addEventListener('click', function () {
          select(index);
        });
        el.rail.appendChild(li);
      });
    }

    function select(index) {
      var segment = SEGMENTS[index];
      state.index = index;
      state.remaining = segment.duration;
      state.remainingAff = segment.duration;
      state.remainingNeg = segment.duration;
      state.active = segment.type === 'dual' ? 'aff' : (segment.side === 'neg' ? 'neg' : 'aff');
      pause();

      if (el.seg) el.seg.textContent = segment.name;

      // 同步当前环节高亮，并滚动到可视区域
      if (el.rail) {
        Array.prototype.forEach.call(el.rail.children, function (li, i) {
          var active = i === index;
          li.classList.toggle('on', active);
          if (active) {
            var offset = li.offsetTop - el.rail.clientHeight / 2 + li.offsetHeight / 2;
            el.rail.scrollTop = Math.max(0, offset);
          }
        });
      }

      // 场景按钮与环节的联动
      el.scenarioButtons.forEach(function (button) {
        var key = button.getAttribute('data-scenario');
        button.classList.toggle('on', SCENARIOS[key] === index);
      });

      render();
    }

    function toggle() {
      if (state.running) {
        pause();
        return;
      }
      var segment = SEGMENTS[state.index];
      if (segment.duration === 0) return;
      state.running = true;
      state.last = 0;
      el.toggleLabel.textContent = '暂停';
      el.side.classList.add('live');
      rafStart();
    }

    function pause() {
      state.running = false;
      state.last = 0;
      cancelAnimationFrame(state.raf);
      if (el.toggleLabel) el.toggleLabel.textContent = '开始';
      if (el.side) el.side.classList.remove('live');
    }

    function rafStart() {
      cancelAnimationFrame(state.raf);
      state.raf = requestAnimationFrame(function loop(now) {
        if (!state.running) return;
        if (!state.last) state.last = now;
        var delta = (now - state.last) / 1000;
        state.last = now;
        advance(delta);
        if (state.running) {
          state.raf = requestAnimationFrame(loop);
        }
      });
    }

    function advance(delta) {
      var segment = SEGMENTS[state.index];

      if (segment.type === 'dual') {
        var key = state.active === 'neg' ? 'remainingNeg' : 'remainingAff';
        state[key] = Math.max(0, state[key] - delta);
        if (state[key] <= 0) {
          state[key] = 0;
          pause();
        }
      } else {
        state.remaining = Math.max(0, state.remaining - delta);
        if (state.remaining <= 0) {
          state.remaining = 0;
          pause();
        }
      }

      render();
    }

    function render() {
      var segment = SEGMENTS[state.index];
      var isHold = segment.duration === 0;
      var isDual = segment.type === 'dual';

      el.hold.hidden = !isHold;
      el.time.hidden = isHold || isDual;
      el.dual.hidden = !isDual;
      el.track.hidden = isHold || isDual;
      el.side.hidden = isHold;

      if (isHold) {
        el.hold.textContent = segment.name;
        pause();
        return;
      }

      if (isDual) {
        if (!state.remainingAff) state.remainingAff = segment.duration;
        if (!state.remainingNeg) state.remainingNeg = segment.duration;
        el.dualAff.textContent = formatDual(state.remainingAff);
        el.dualNeg.textContent = formatDual(state.remainingNeg);
        el.dualAffCol.classList.toggle('active', state.active === 'aff');
        el.dualNegCol.classList.toggle('active', state.active === 'neg');
        el.sideText.textContent = state.active === 'aff' ? '正方发言中' : '反方发言中';
        el.side.classList.toggle('neg', state.active === 'neg');
        return;
      }

      el.side.classList.remove('neg');
      var tone = segment.side === 'neg' ? 'neg' : (segment.side === 'neutral' ? 'neutral' : 'aff');
      el.time.setAttribute('data-tone', tone);
      el.time.textContent = formatTime(state.remaining);

      var ratio = segment.duration > 0 ? state.remaining / segment.duration : 0;
      el.bar.style.width = Math.max(0, Math.min(100, ratio * 100)) + '%';

      var warn = state.remaining <= 30 && state.remaining > 5;
      var danger = state.remaining <= 5;
      el.time.classList.toggle('warn', warn);
      el.time.classList.toggle('danger', danger);
      el.bar.classList.toggle('warn', warn);
      el.bar.classList.toggle('danger', danger);

      if (tone === 'neutral') {
        el.sideText.textContent = '中立计时中';
      } else {
        el.sideText.textContent = tone === 'aff' ? '正方发言' : '反方发言';
      }
    }

    // 双边计时各自维护剩余秒数
    state.remainingAff = SEGMENTS[state.index].duration;
    state.remainingNeg = SEGMENTS[state.index].duration;

    function formatTime(value) {
      var sec = Math.max(0, value);
      if (sec <= 5) return sec.toFixed(2);
      var total = Math.ceil(sec);
      var minutes = Math.floor(total / 60);
      var seconds = total % 60;
      return pad(minutes) + ':' + pad(seconds);
    }

    function formatDual(value) {
      var sec = Math.max(0, value);
      if (sec <= 5) return sec.toFixed(2);
      var total = Math.ceil(sec);
      return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
    }

    function pad(number) {
      return String(number).padStart(2, '0');
    }
  }

  /* ------------------------------------------------------------------ */
  /* 主题预览                                                            */
  /* ------------------------------------------------------------------ */

  function initThemePicker() {
    var preview = document.querySelector('[data-preview]');
    var picker = document.querySelector('.theme-picker');
    if (!preview || !picker) return;

    var buttons = Array.prototype.slice.call(picker.querySelectorAll('button[data-preset]'));

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var preset = button.getAttribute('data-preset');
        preview.setAttribute('data-preset', preset);
        preview.animate(
          [
            { opacity: 0.65, transform: 'translateY(6px) scale(0.995)' },
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
