/**
 * DriverLine — Studio homepage behaviour
 * Hero route run, the challenge-to-solution board, drawn sequences,
 * and the estimator's controls. The calculator's own math stays in
 * cost-calculator.js; this file only reads its results.
 */

(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('header');

  function onFrame(fn) {
    let queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn(); });
    };
  }

  function once(el, fn, options) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { io.disconnect(); fn(); }
      });
    }, options || { threshold: 0.35 });
    io.observe(el);
  }

  // ===========================================
  // Hero: routes leave your location and resolve to covered
  // ===========================================

  function initHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;

    const svg = hero.querySelector('.hm');
    const map = hero.querySelector('.hero__map');
    const tag = hero.querySelector('.hm-tag--depot');
    const routes = Array.from(hero.querySelectorAll('.hm-route'));
    const DEPOT = { x: 1160, y: 520 };
    const WORLD = { w: 1600, h: 1000 };

    // Crop the map around the depot so narrow screens still see it whole
    function frame() {
      const r = map.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const aspect = r.width / r.height;
      let w = WORLD.w, h = WORLD.h, x = 0, y = 0;
      if (r.width >= 768 && aspect < 1.1) {
        // tablet portrait: zoom in and drop the depot below the copy
        h = 640; w = h * aspect;
        x = Math.min(Math.max(DEPOT.x - w * 0.68, 0), WORLD.w - w);
        y = Math.max(DEPOT.y - h * 0.8, 0);
      } else if (aspect < WORLD.w / WORLD.h) {
        // taller than the world: fit height, slide x so the depot sits right of centre
        const narrow = r.width < 768;
        h = narrow ? 760 : WORLD.h;
        w = h * aspect;
        x = Math.min(Math.max(DEPOT.x - w * (narrow ? 0.5 : 0.62), 0), WORLD.w - w);
        y = narrow ? Math.min(Math.max(DEPOT.y - h * 0.5, 0), WORLD.h - h) : 0;
      } else {
        h = WORLD.w / aspect;
        y = Math.min(Math.max(DEPOT.y - h * 0.5, 0), WORLD.h - h);
      }
      svg.setAttribute('viewBox', [x, y, w, h].map(function (n) { return Math.round(n); }).join(' '));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // place the depot label beside the depot
      const sx = (DEPOT.x - x) / w * r.width;
      const sy = (DEPOT.y - y) / h * r.height;
      tag.style.transform = 'translate(' + Math.round(sx + 30) + 'px,' + Math.round(sy + 26) + 'px)';
      tag.classList.add('is-placed');

      // keep strokes and markers at a constant on-screen size whatever the crop
      const u = w / r.width * (r.width < 768 ? 0.85 : 1);
      svg.style.setProperty('--u', u.toFixed(3));
      svg.querySelectorAll('.hm-stop, .hm-depot').forEach(function (g) {
        if (!g.dataset.at) g.dataset.at = g.getAttribute('transform');
        g.setAttribute('transform', g.dataset.at + ' scale(' + u.toFixed(3) + ')');
      });
      svg.querySelectorAll('.hm-head').forEach(function (c) { c.setAttribute('r', (5 * u).toFixed(2)); });
    }

    frame();
    window.addEventListener('resize', onFrame(frame));

    // Measure each route and where its stops fall along it
    const data = routes.map(function (g) {
      const line = g.querySelector('.hm-line');
      const glow = g.querySelector('.hm-glow');
      const head = g.querySelector('.hm-head');
      const len = line.getTotalLength();
      const stops = Array.from(g.querySelectorAll('.hm-stop')).map(function (s) {
        const m = /translate\(([\d.]+)[ ,]+([\d.]+)\)/.exec(s.getAttribute('transform'));
        const sx = parseFloat(m[1]), sy = parseFloat(m[2]);
        let best = 0, bestD = Infinity;
        for (let l = 0; l <= len; l += 4) {
          const p = line.getPointAtLength(l);
          const d = (p.x - sx) * (p.x - sx) + (p.y - sy) * (p.y - sy);
          if (d < bestD) { bestD = d; best = l; }
        }
        return { el: s, at: best / len };
      });
      [line, glow].forEach(function (p) { p.style.strokeDasharray = len + ' ' + len; p.style.strokeDashoffset = len; });
      return { line: line, glow: glow, head: head, len: len, stops: stops };
    });

    function settle() {
      data.forEach(function (r) {
        [r.line, r.glow].forEach(function (p) { p.style.strokeDashoffset = 0; });
        r.stops.forEach(function (s) { s.el.classList.add('is-lit'); });
      });
      hero.classList.add('is-in', 'is-run', 'is-covered');
    }

    function run() {
      hero.classList.add('is-in', 'is-run');
      const t0 = performance.now() + 700;
      const speed = 0.62; // world units per ms
      const plan = data.map(function (r, i) {
        return { r: r, start: i * 240, dur: Math.max(900, r.len / speed) };
      });
      const end = Math.max.apply(null, plan.map(function (p) { return p.start + p.dur; }));
      const ease = function (t) { return 1 - Math.pow(1 - t, 3); };

      function step(now) {
        const t = now - t0;
        plan.forEach(function (p) {
          const k = Math.min(Math.max((t - p.start) / p.dur, 0), 1);
          const e = ease(k);
          const off = p.r.len * (1 - e);
          p.r.line.style.strokeDashoffset = off;
          p.r.glow.style.strokeDashoffset = off;
          if (k > 0 && k < 1) {
            const pt = p.r.line.getPointAtLength(p.r.len * e);
            p.r.head.setAttribute('cx', pt.x);
            p.r.head.setAttribute('cy', pt.y);
            p.r.head.style.opacity = 1;
          } else {
            p.r.head.style.opacity = 0;
          }
          p.r.stops.forEach(function (s) { if (e >= s.at - 0.002) s.el.classList.add('is-lit'); });
        });
        if (t < end) requestAnimationFrame(step);
        else hero.classList.add('is-covered');
      }
      requestAnimationFrame(step);
    }

    // Desktop: pointing at a route isolates it (once the run has settled)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      routes.forEach(function (g) {
        const hit = g.querySelector('.hm-hit');
        hit.addEventListener('pointerenter', function () {
          if (!hero.classList.contains('is-covered')) return;
          g.classList.add('is-hover'); hero.classList.add('is-focus');
        });
        hit.addEventListener('pointerleave', function () {
          g.classList.remove('is-hover'); hero.classList.remove('is-focus');
        });
      });
    }

    if (reduce.matches) { settle(); return; }

    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    let started = false;
    const go = function () { if (!started) { started = true; run(); } };
    ready.then(function () { requestAnimationFrame(go); });
    setTimeout(go, 1200); // never hold the page for fonts
  }

  // ===========================================
  // Shift: the board follows the reader from uncovered to covered
  // ===========================================

  function initShift() {
    const root = document.querySelector('[data-shift]');
    if (!root) return;
    const board = root.querySelector('[data-board]');
    const items = Array.from(root.querySelectorAll('.plist__item'));
    const solution = root.querySelector('[data-phase="solution"]');
    const lines = Array.from(board.querySelectorAll('.bm-line'));
    const stops = Array.from(board.querySelectorAll('.bm-stop, .board__dot[data-g]'));

    function update() {
      const vh = window.innerHeight;
      const focus = vh * 0.45;

      // active challenge: the item crossing the reading line
      let active = -1;
      items.forEach(function (it, i) {
        const r = it.getBoundingClientRect();
        if (r.top < focus && r.bottom > focus * 0.5) active = i;
      });

      // coverage: closes across the solution's opening
      const s = solution.getBoundingClientRect();
      const span = vh * 0.9;
      const p = Math.min(Math.max((vh * 0.85 - s.top) / span, 0), 1);
      const closed = Math.round(p * 6);
      const on = s.top < vh * 0.7;

      items.forEach(function (it, i) { it.classList.toggle('is-active', i === active && !on); });
      lines.forEach(function (l) { l.classList.toggle('is-closed', +l.dataset.g < closed); });
      stops.forEach(function (st) {
        const g = +st.dataset.g;
        st.classList.toggle('is-closed', g < closed);
        st.classList.toggle('is-active', g === active && !on);
      });
      board.classList.toggle('is-on', on);
      board.classList.toggle('is-done', closed >= 6);
      board.style.setProperty('--cov', (closed / 6).toFixed(3));
    }

    const tick = onFrame(update);
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    update();
  }

  // ===========================================
  // Drawn-once sequences
  // ===========================================

  function initDrawn() {
    const steps = document.querySelector('[data-steps]');
    once(steps, function () { steps.classList.add('is-drawn'); }, { threshold: 0.4 });

    const close = document.querySelector('.close');
    once(close, function () { close.classList.add('is-drawn'); }, { threshold: 0.3 });

    // the closing section carries a settled copy of the hero's map
    const source = document.querySelector('.hero .hm');
    if (close && source) {
      const wrap = document.createElement('div');
      wrap.className = 'close__map';
      wrap.setAttribute('aria-hidden', 'true');
      const copy = source.cloneNode(true);
      copy.removeAttribute('style');
      copy.setAttribute('viewBox', '400 40 1200 920');
      copy.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      copy.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      copy.querySelectorAll('.hm-line, .hm-glow').forEach(function (n) { n.removeAttribute('style'); });
      copy.querySelectorAll('.hm-stop').forEach(function (n) { n.classList.add('is-lit'); });
      copy.querySelectorAll('.hm-stop, .hm-depot').forEach(function (n) { if (n.dataset.at) n.setAttribute('transform', n.dataset.at); });
      wrap.appendChild(copy);
      close.insertBefore(wrap, close.firstChild);
    }
  }

  // ===========================================
  // Industries: the automotive origin branches to every daily route
  // ===========================================

  function initBranch() {
    const map = document.querySelector('[data-branch]');
    if (!map) return;
    const svg = map.querySelector('.ind__lines');
    const group = map.querySelector('.ind__paths');
    const port = map.querySelector('[data-branch-port]');
    const leaves = Array.from(map.querySelectorAll('[data-branch-leaf]'));
    const NS = 'http://www.w3.org/2000/svg';

    function draw() {
      if (getComputedStyle(svg).display === 'none') return;
      const box = map.getBoundingClientRect();
      const pr = port.getBoundingClientRect();
      const x0 = pr.left + pr.width / 2 - box.left;
      const y0 = pr.top + pr.height / 2 - box.top;
      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      group.textContent = '';
      leaves.forEach(function (leaf) {
        const lr = leaf.getBoundingClientRect();
        const x1 = lr.left - box.left - 9;
        const y1 = lr.top - box.top + 38;
        const mx = x0 + (x1 - x0) * 0.5;
        const dy = y1 - y0;
        const r = Math.min(22, Math.abs(dy) / 2, (x1 - x0) / 4);
        const sgn = dy === 0 ? 0 : dy > 0 ? 1 : -1;
        let d = 'M' + x0 + ' ' + y0;
        if (Math.abs(dy) < 1) {
          d += 'H' + x1;
        } else {
          d += 'H' + (mx - r) + 'Q' + mx + ' ' + y0 + ' ' + mx + ' ' + (y0 + sgn * r) +
               'V' + (y1 - sgn * r) + 'Q' + mx + ' ' + y1 + ' ' + (mx + r) + ' ' + y1 + 'H' + x1;
        }
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('pathLength', '1');
        group.appendChild(path);
      });
    }

    draw();
    if ('ResizeObserver' in window) new ResizeObserver(onFrame(draw)).observe(map);
    else window.addEventListener('resize', onFrame(draw));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    once(map, function () { map.classList.add('is-drawn'); }, { threshold: 0.35 });
  }

  // ===========================================
  // Estimator controls (inputs only; math lives in cost-calculator.js)
  // ===========================================

  function initEstimator() {
    const form = document.getElementById('cost-calculator-form');
    if (!form) return;

    const fmt = {
      int: function (v) { return String(Math.round(v)); },
      money2: function (v) { return '$' + v.toFixed(2); },
      half: function (v) { return (Math.round(v * 2) / 2).toString(); }
    };

    const ranges = Array.from(form.querySelectorAll('.ctl__range'));
    function paint(input) {
      const min = parseFloat(input.min), max = parseFloat(input.max), v = parseFloat(input.value);
      input.style.setProperty('--pct', ((v - min) / (max - min) * 100).toFixed(2) + '%');
      const out = form.querySelector('output[for="' + input.id + '"]');
      if (out) out.textContent = fmt[out.dataset.format](v);
    }
    ranges.forEach(function (input) {
      paint(input);
      input.addEventListener('input', function () { paint(input); });
    });

    // Vehicles follow drivers (cost-calculator.js) — keep the drivers track painted
    const drivers = document.getElementById('drivers');

    // Days per week: a segmented choice that writes into the real input
    const days = document.getElementById('daysPerWeek');
    const picks = form.querySelector('[data-days]');
    if (days && picks) {
      picks.hidden = false;
      days.setAttribute('tabindex', '-1');
      days.setAttribute('aria-hidden', 'true');
      picks.setAttribute('role', 'radiogroup');
      picks.setAttribute('aria-labelledby', 'days-label');
      picks.addEventListener('change', function (e) {
        if (e.target.name !== 'daysPick') return;
        days.value = e.target.value;
        days.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    // Cost mix bar reads the calculator's results
    const ids = ['result-wages', 'result-burden', 'result-fuel', 'result-vehicle-fixed', 'result-admin'];
    const els = ids.map(function (id) { return document.getElementById(id); });
    const segs = Array.from(document.querySelectorAll('.mix__seg'));
    function mix() {
      const vals = els.map(function (el) { return parseFloat((el.textContent || '0').replace(/[^\d.]/g, '')) || 0; });
      const total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
      segs.forEach(function (s, i) { s.style.setProperty('--w', (vals[i] / total * 100).toFixed(2)); });
    }
    mix();
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(onFrame(mix));
      els.forEach(function (el) { mo.observe(el, { childList: true, characterData: true, subtree: true }); });
    }
    if (drivers) drivers.addEventListener('input', function () { paint(drivers); });
  }

  // ===========================================
  // Header: follows the surface beneath it
  // ===========================================

  function initHeaderSurface() {
    if (!header) return;
    const surfaces = Array.from(document.querySelectorAll('[data-surface]'));
    const menu = document.getElementById('mobile-nav');
    function update() {
      const y = header.offsetHeight * 0.5;
      let light = false;
      for (let i = 0; i < surfaces.length; i++) {
        const r = surfaces[i].getBoundingClientRect();
        if (r.top <= y && r.bottom > y) { light = surfaces[i].dataset.surface === 'light'; break; }
      }
      if (menu && menu.classList.contains('mobile-nav--open')) light = false;
      header.classList.toggle('hd--light', light);
    }
    const tick = onFrame(update);
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    const btn = document.getElementById('mobile-menu-btn');
    if (btn) btn.addEventListener('click', function () { setTimeout(update, 0); });
    update();
  }

  function init() {
    initHeaderSurface();
    initHero();
    initShift();
    initDrawn();
    initBranch();
    initEstimator();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
