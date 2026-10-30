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
  // Hero: delivery loops leave your location, visit their stops,
  // return, and light the territory they cover
  // ===========================================

  function initHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;

    const svg = hero.querySelector('.hm');
    const map = hero.querySelector('.hero__map');
    const tag = hero.querySelector('.hm-tag--depot');
    const routes = Array.from(hero.querySelectorAll('.hm-route'));
    const DEPOT = { x: 1160, y: 520 };
    const AREA = { x: 1240, y: 560, w: 700, h: 620 }; // the coverage cluster

    // Fit the coverage cluster into a chosen part of the map at every size
    function frame() {
      const r = map.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const stacked = getComputedStyle(map).position !== 'absolute';
      let s, cx, cy;
      if (stacked) {
        // its own band below the copy: centred, nearly full width
        s = Math.min(0.94 * r.width / AREA.w, 0.88 * r.height / AREA.h);
        cx = r.width / 2; cy = r.height / 2;
      } else {
        // beside the copy: fill whatever space the type leaves, clear of header and proof row
        let edge = 0;
        const range = document.createRange();
        hero.querySelectorAll('.hero__line > span, .hero__desc, .hero__kicker').forEach(function (el) {
          range.selectNodeContents(el); // the text itself, not its block box
          edge = Math.max(edge, range.getBoundingClientRect().right - r.left);
        });
        const left = edge + Math.max(48, r.width * 0.04);
        const right = r.width - Math.max(24, r.width * 0.035);
        const top = (header ? header.offsetHeight : 72) + 40;
        const bottom = r.height - 96;
        s = Math.min((right - left) / AREA.w, (bottom - top) / AREA.h, 1.05);
        cx = (left + right) / 2; cy = (top + bottom) / 2;
      }
      const w = r.width / s, h = r.height / s;
      const x = AREA.x - cx / s, y = AREA.y - cy / s;
      svg.setAttribute('viewBox', [x, y, w, h].map(function (n) { return n.toFixed(1); }).join(' '));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // strokes and markers keep their on-screen size whatever the scale
      const u = (1 / s) * (r.width < 768 ? 0.78 : 1);
      svg.style.setProperty('--u', u.toFixed(3));
      svg.querySelectorAll('.hm-stop, .hm-depot').forEach(function (g) {
        if (!g.dataset.at) g.dataset.at = g.getAttribute('transform');
        g.setAttribute('transform', g.dataset.at + ' scale(' + u.toFixed(3) + ')');
      });
      svg.querySelectorAll('.hm-head').forEach(function (g) { g.style.setProperty('--hs', u.toFixed(3)); });

      // the depot label sits inside the south-east territory, clear of the lanes
      const sx = (DEPOT.x - x) * s, sy = (DEPOT.y - y) * s;
      const dx = r.width < 768 ? 14 : 26, dy = r.width < 360 ? 12 : r.width < 768 ? 20 : 24;
      tag.style.transform = 'translate(' + Math.round(sx + dx) + 'px,' + Math.round(sy + dy) + 'px)';
      tag.classList.add('is-placed');
      // where the south-east lane runs close, keep only the state line
      const room = (1551 - x) * s - (sx + dx) - 10;
      tag.classList.remove('is-compact');
      if (tag.offsetWidth > room) tag.classList.add('is-compact');
    }

    frame();
    window.addEventListener('resize', onFrame(frame));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(frame);

    // Measure each loop and where its stops fall along it
    const data = routes.map(function (g) {
      const line = g.querySelector('.hm-line');
      const head = g.querySelector('.hm-head');
      const len = line.getTotalLength();
      const stops = Array.from(g.querySelectorAll('.hm-stop')).map(function (st) {
        const m = /translate\(([\d.]+)[ ,]+([\d.]+)\)/.exec(st.getAttribute('transform'));
        const sx = parseFloat(m[1]), sy = parseFloat(m[2]);
        let best = 0, bestD = Infinity;
        for (let l = 0; l <= len; l += 3) {
          const p = line.getPointAtLength(l);
          const d = (p.x - sx) * (p.x - sx) + (p.y - sy) * (p.y - sy);
          if (d < bestD) { bestD = d; best = l; }
        }
        return { el: st, at: best / len };
      });
      line.style.strokeDasharray = len + ' ' + len;
      line.style.strokeDashoffset = len;
      return { g: g, line: line, head: head, len: len, stops: stops };
    });

    function settle() {
      data.forEach(function (r) {
        r.line.style.strokeDashoffset = 0;
        r.stops.forEach(function (st) { st.el.classList.add('is-lit'); });
        r.g.classList.add('is-closed');
      });
      hero.classList.add('is-in', 'is-run', 'is-covered');
    }

    function run() {
      hero.classList.add('is-in', 'is-run');
      const t0 = performance.now() + 620;
      const DUR = 1500, GAP = 260;
      const ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
      const end = (data.length - 1) * GAP + DUR;

      function step(now) {
        const t = now - t0;
        data.forEach(function (r, i) {
          const k = Math.min(Math.max((t - i * GAP) / DUR, 0), 1);
          const e = ease(k);
          r.line.style.strokeDashoffset = (r.len * (1 - e)).toFixed(1);
          if (k > 0 && k < 1) {
            const pt = r.line.getPointAtLength(r.len * e);
            r.head.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
            r.head.classList.add('is-moving');
          } else {
            r.head.classList.remove('is-moving');
          }
          r.stops.forEach(function (st) { if (e >= st.at) st.el.classList.add('is-lit'); });
          if (k === 1) r.g.classList.add('is-closed');
        });
        if (t < end) requestAnimationFrame(step);
        else hero.classList.add('is-covered');
      }
      requestAnimationFrame(step);
    }

    // Desktop: pointing at a loop isolates it (once the run has settled)
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
    setTimeout(go, 900); // never hold the page for fonts
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
    const caption = board.querySelector('[data-focus]');
    const titles = items.map(function (it) { return it.querySelector('.plist__title').textContent.trim(); });
    const wide = window.matchMedia('(min-width: 1024px)');
    let shown = caption ? caption.textContent : '', swapT = 0;

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
      const span = vh * 1.05;
      const p = Math.min(Math.max((vh * 0.85 - s.top) / span, 0), 1);
      const closed = Math.round(p * 6);
      const on = s.top < vh * 0.7;

      items.forEach(function (it, i) { it.classList.toggle('is-active', i === active && !on); });
      const label = active >= 0 && wide.matches ? titles[active] : 'Coverage gaps';
      if (caption && label !== shown) {
        shown = label;
        caption.classList.add('is-swap');
        clearTimeout(swapT);
        swapT = setTimeout(function () { caption.textContent = shown; caption.classList.remove('is-swap'); }, 160);
      }
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
      copy.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      copy.querySelectorAll('.hm-line').forEach(function (n) { n.removeAttribute('style'); });
      copy.querySelectorAll('.hm-route').forEach(function (n) { n.classList.add('is-closed'); n.classList.remove('is-hover'); });
      copy.querySelectorAll('.hm-stop').forEach(function (n) { n.classList.add('is-lit'); });
      wrap.appendChild(copy);
      close.insertBefore(wrap, close.firstChild);

      const AREA = { x: 1240, y: 560, w: 700, h: 620 };
      const frameClose = function () {
        const r = wrap.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const band = r.width < 768;
        const s = band
          ? Math.min(0.9 * r.width / AREA.w, 0.84 * r.height / AREA.h)
          : Math.min(0.4 * r.width / AREA.w, 0.72 * r.height / AREA.h);
        const cx = band ? r.width / 2 : r.width * 0.74, cy = r.height / 2;
        const u = (1 / s) * (band ? 0.78 : 1);
        copy.setAttribute('viewBox', [AREA.x - cx / s, AREA.y - cy / s, r.width / s, r.height / s].map(function (n) { return n.toFixed(1); }).join(' '));
        copy.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        copy.style.setProperty('--u', u.toFixed(3));
        copy.querySelectorAll('.hm-stop, .hm-depot').forEach(function (g) {
          g.setAttribute('transform', g.dataset.at + ' scale(' + u.toFixed(3) + ')');
        });
      };
      frameClose();
      window.addEventListener('resize', onFrame(frameClose));
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
      leaves.forEach(function (leaf, i) {
        const lr = leaf.getBoundingClientRect();
        const x1 = lr.left - box.left - 4;
        const y1 = lr.top - box.top + 31.5;
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
        const track = document.createElementNS(NS, 'path');
        track.setAttribute('class', 'br-track');
        track.setAttribute('d', d);
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('class', 'br-line');
        path.setAttribute('d', d);
        path.setAttribute('pathLength', '1');
        path.style.setProperty('--i', i);
        group.appendChild(track);
        group.appendChild(path);
      });
    }

    draw();
    if ('ResizeObserver' in window) new ResizeObserver(onFrame(draw)).observe(map);
    else window.addEventListener('resize', onFrame(draw));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    once(map, function () {
      map.classList.add('is-drawn');
      setTimeout(function () { map.classList.add('is-settled'); }, 1900); // later redraws appear in place
    }, { threshold: 0.35 });
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
