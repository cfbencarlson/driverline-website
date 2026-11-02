/**
 * DriverLine — Studio homepage behaviour
 * Hero route run, the challenge-to-solution board, drawn sequences,
 * and the estimator's controls. The calculator's own math stays in
 * cost-calculator.js; this file only reads its results.
 */

(function () {
  'use strict';

  window.studioReady = true;

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
  // The operation in layers (hero and board)
  // ===========================================

  // scale a stack to its box; W and H are the stack's own footprint at scale 1
  function fitStack(stk, W, H, max) {
    const r = stk.getBoundingClientRect();
    if (!r.width || !r.height) return;
    stk.style.setProperty('--fit', Math.min(r.width / W, r.height / H, max || 9).toFixed(3));
  }

  // pointing at a route shows its driver, its thread, and the backups that could take it
  function pointable(stk) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    stk.classList.add('is-live');
    stk.querySelectorAll('.rt').forEach(function (rt) {
      const parts = stk.querySelectorAll('[data-r="' + rt.dataset.r + '"]');
      const hit = rt.querySelector('.rt__hit');
      hit.addEventListener('pointerenter', function () {
        parts.forEach(function (p) { p.classList.add('is-hover'); });
        stk.classList.add('is-focus');
      });
      hit.addEventListener('pointerleave', function () {
        parts.forEach(function (p) { p.classList.remove('is-hover'); });
        stk.classList.remove('is-focus');
      });
    });
  }

  // ===========================================
  // Hero: a plan of loose stops organizes into routes, then the camera
  // turns to show the layer beneath — DriverLine, carrying the drivers
  // ===========================================

  function initHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const map = hero.querySelector('.hero__map');
    const stk = hero.querySelector('.stk--hero');
    if (!stk) return;

    function frame() {
      if (getComputedStyle(map).position === 'absolute') {
        // beside the copy: whatever space the type leaves free
        const m = map.getBoundingClientRect();
        let edge = 0;
        const range = document.createRange();
        hero.querySelectorAll('.hero__line > span, .hero__desc, .hero__kicker').forEach(function (el) {
          range.selectNodeContents(el); // the text itself, not its block box
          edge = Math.max(edge, range.getBoundingClientRect().right - m.left);
        });
        stk.style.left = Math.round(edge + Math.max(32, m.width * 0.025)) + 'px';
        stk.style.width = 'auto';
      } else {
        stk.style.left = ''; stk.style.width = '';
      }
      fitStack(stk, 450, 400, 1.38);
    }
    frame();
    window.addEventListener('resize', onFrame(frame));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(frame);

    const STEPS = [['is-plan', 250], ['is-route', 900], ['is-lift', 1900], ['is-assign', 1200], ['is-ready', 1400]];
    if (reduce.matches) {
      hero.classList.add('is-in');
      STEPS.forEach(function (s) { hero.classList.add(s[0]); });
      pointable(stk);
      return;
    }

    let shown = false, seen = false, started = false;
    function play() {
      if (started || !shown || !seen) return;
      if (document.hidden) { document.addEventListener('visibilitychange', play, { once: true }); return; }
      started = true;
      let at = 0;
      STEPS.forEach(function (s, i) {
        at += s[1];
        setTimeout(function () {
          hero.classList.add(s[0]);
          if (i === STEPS.length - 1) setTimeout(function () { pointable(stk); }, 700);
        }, at);
      });
    }
    function show() {
      if (shown) return;
      shown = true;
      hero.classList.add('is-in');
      play();
    }
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () { requestAnimationFrame(show); });
    setTimeout(show, 900); // never hold the page for fonts
    once(map, function () { seen = true; play(); }, { threshold: 0.35 });
  }

  // ===========================================
  // Shift: in-house on one layer, then DriverLine's layer beneath.
  // Scroll picks the chapter; CSS plays each change and reverses it.
  // ===========================================

  function initShift() {
    const root = document.querySelector('[data-shift]');
    if (!root) return;
    const board = root.querySelector('[data-board]');
    const items = Array.from(root.querySelectorAll('.plist__item'));
    const solution = root.querySelector('[data-phase="solution"]');
    const caption = board.querySelector('[data-focus]');
    const titles = items.map(function (it) { return it.querySelector('.plist__title').textContent.trim(); });
    const wide = window.matchMedia('(min-width: 1024px)');
    const stk = board.querySelector('.stk--board');
    let shown = caption ? caption.textContent : '', swapT = 0, timers = [];

    // 0 operating · 1 a driver calls out · 2 the gap is yours · 3 DriverLine
    function chapter() {
      const vh = window.innerHeight, focus = vh * 0.45;
      if (solution.getBoundingClientRect().top < vh * 0.7) return 3;
      let reached = -1;
      items.forEach(function (it, i) { if (it.getBoundingClientRect().top < focus) reached = i; });
      return reached >= 3 ? 2 : reached === 2 ? 1 : 0;
    }

    function managed(on) {
      timers.forEach(clearTimeout);
      timers = [];
      if (!on) {
        board.classList.remove('is-managed', 'is-on', 'is-disrupt', 'is-backup', 'is-done');
        return;
      }
      board.classList.add('is-managed', 'is-on');
      // reduced motion keeps the clearest still: every route tied to a driver, backups on standby
      if (reduce.matches) { board.classList.add('is-done'); return; }
      const r = board.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        board.classList.add('is-disrupt', 'is-backup', 'is-done');
        return;
      }
      // a pause once the layers settle, then the callout underneath, then the backup
      timers.push(setTimeout(function () { board.classList.add('is-disrupt'); }, 3400));
      timers.push(setTimeout(function () { board.classList.add('is-backup'); }, 4500));
      timers.push(setTimeout(function () { board.classList.add('is-done'); }, 6800));
    }

    function update() {
      const vh = window.innerHeight, focus = vh * 0.45;
      const ch = chapter();

      // active challenge: the item crossing the reading line
      let active = -1;
      items.forEach(function (it, i) {
        const r = it.getBoundingClientRect();
        if (r.top < focus && r.bottom > focus * 0.5) active = i;
      });
      items.forEach(function (it, i) { it.classList.toggle('is-active', i === active && ch < 3); });
      const label = active >= 0 && wide.matches && ch < 3 ? titles[active] : 'Coverage gaps';
      if (caption && label !== shown) {
        shown = label;
        caption.classList.add('is-swap');
        clearTimeout(swapT);
        swapT = setTimeout(function () { caption.textContent = shown; caption.classList.remove('is-swap'); }, 160);
      }

      board.classList.toggle('is-callout', ch >= 1);
      board.classList.toggle('is-burden', ch >= 2);
      if ((ch === 3) !== board.classList.contains('is-managed')) managed(ch === 3);
    }

    const fit = function () { if (stk) fitStack(stk, 440, 420, 1.25); };
    fit();
    const tick = onFrame(update);
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', onFrame(function () { fit(); update(); }));
    update();
  }

  // ===========================================
  // Drawn-once sequences
  // ===========================================

  function initDrawn() {
    const steps = document.querySelector('[data-steps]');
    once(steps, function () { steps.classList.add('is-drawn'); }, { threshold: 0.4 });

    // any other drawn-once route device on the page
    document.querySelectorAll('[data-draw]').forEach(function (el) {
      once(el, function () { el.classList.add('is-drawn'); }, { threshold: 0.3 });
    });

    const close = document.querySelector('.close');
    once(close, function () { close.classList.add('is-drawn'); }, { threshold: 0.3 });

    // the closing section carries the settled operation, still
    const source = document.querySelector('.hero .stk--hero');
    if (close && source) {
      const wrap = document.createElement('div');
      wrap.className = 'close__map';
      wrap.setAttribute('aria-hidden', 'true');
      const copy = source.cloneNode(true);
      copy.removeAttribute('style');
      copy.removeAttribute('data-stack');
      copy.classList.remove('is-live', 'is-focus');
      copy.querySelectorAll('.is-hover').forEach(function (n) { n.classList.remove('is-hover'); });
      wrap.appendChild(copy);
      close.insertBefore(wrap, close.firstChild);
      const frameClose = function () { fitStack(copy, 440, 370, 1.3); };
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
      const rects = leaves.map(function (leaf) { return leaf.getBoundingClientRect(); });
      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      group.textContent = '';
      leaves.forEach(function (leaf, i) {
        const lr = rects[i];
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

    // Steppers: tap or hold − / +; the input itself stays the source of truth
    form.querySelectorAll('.stp').forEach(function (box) {
      const input = box.querySelector('.stp__input');
      const btns = box.querySelectorAll('.stp__btn');
      function sync() {
        const v = parseFloat(input.value);
        btns[0].disabled = Number.isFinite(v) && v <= parseFloat(input.min);
        btns[1].disabled = Number.isFinite(v) && v >= parseFloat(input.max);
      }
      function nudge(dir) {
        if (!Number.isFinite(parseFloat(input.value))) input.value = input.defaultValue;
        if (dir > 0) input.stepUp(); else input.stepDown();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      }
      btns.forEach(function (btn) {
        let hold = 0, rep = 0;
        const stop = function () { clearTimeout(hold); clearInterval(rep); };
        btn.addEventListener('pointerdown', function (e) {
          if (btn.disabled) return;
          e.preventDefault();
          const dir = +btn.dataset.dir;
          nudge(dir);
          hold = setTimeout(function () { rep = setInterval(function () { nudge(dir); }, 70); }, 420);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { btn.addEventListener(t, stop); });
        btn.addEventListener('click', function (e) { if (e.detail === 0) nudge(+btn.dataset.dir); });
      });
      input.addEventListener('input', sync);
      sync();
    });

    // Cost mix bar reads the calculator's results
    const ids = ['result-wages', 'result-burden', 'result-fuel', 'result-vehicle-fixed', 'result-admin'];
    const els = ids.map(function (id) { return document.getElementById(id); });
    const segs = Array.from(document.querySelectorAll('.mix__seg'));
    const pcts = Array.from(document.querySelectorAll('.rows__pct'));
    // Resources: tie each input group to the result lines it feeds, and confirm changes
    const sheet = document.querySelector('.sheet');
    const rowsAll = Array.from(document.querySelectorAll('.rows__row'));
    const FEEDS = [[0, 1], [2, 3], [4]];
    function feed(map) {
      rowsAll.forEach(function (r, i) { r.classList.toggle('is-dim', !!map && map.indexOf(i) < 0); });
      segs.forEach(function (sg, i) { sg.classList.toggle('is-dim', !!map && map.indexOf(i) < 0); });
    }
    if (sheet) {
      form.querySelectorAll('[data-feeds]').forEach(function (g, gi) {
        g.addEventListener('focusin', function () { feed(FEEDS[gi]); });
        g.addEventListener('focusout', function (e) { if (!g.contains(e.relatedTarget)) feed(null); });
        g.addEventListener('pointerenter', function () { feed(FEEDS[gi]); });
        g.addEventListener('pointerleave', function () { if (!g.contains(document.activeElement)) feed(null); });
      });
    }
    const flashTargets = sheet ? els.concat([document.getElementById('result-total'), document.getElementById('result-daily-total')]) : [];
    const last = new Map();
    flashTargets.forEach(function (el) { last.set(el, el.textContent); });
    function flash() {
      flashTargets.forEach(function (el) {
        if (last.get(el) === el.textContent) return;
        last.set(el, el.textContent);
        if (reduce.matches) return;
        el.classList.add('is-changed');
        clearTimeout(el._t);
        el._t = setTimeout(function () { el.classList.remove('is-changed'); }, 90);
      });
    }
    const basis = document.querySelector('[data-basis]');
    function describe() {
      if (!basis) return;
      const n = function (id) { const v = parseFloat(document.getElementById(id).value); return Number.isFinite(v) ? Math.round(v) : null; };
      const d = n('drivers'), v = n('vehicles'), w = n('daysPerWeek');
      const parts = [];
      if (d) parts.push(d + (d === 1 ? ' driver' : ' drivers'));
      if (v) parts.push(v + (v === 1 ? ' vehicle' : ' vehicles'));
      if (w) parts.push(w + (w === 1 ? ' day a week' : ' days a week'));
      basis.textContent = parts.join(', ');
    }
    form.addEventListener('input', describe);
    form.addEventListener('change', describe);

    // the cost reference can jump to the input that prices each item
    document.querySelectorAll('[data-focus-field]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const input = document.getElementById(a.dataset.focusField);
        if (!input) return;
        e.preventDefault();
        input.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'center' });
        input.focus({ preventScroll: true });
        const box = input.closest('.stp');
        if (box) { box.classList.add('is-called'); setTimeout(function () { box.classList.remove('is-called'); }, 1400); }
      });
    });

    function mix() {
      flash();
      describe();
      const vals = els.map(function (el) { return parseFloat((el.textContent || '0').replace(/[^\d.]/g, '')) || 0; });
      const total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
      segs.forEach(function (s, i) { s.style.setProperty('--w', (vals[i] / total * 100).toFixed(2)); });
      pcts.forEach(function (p, i) { p.textContent = Math.round(vals[i] / total * 100) + '%'; });
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
    // the menu opens dark; re-read the surface whenever it opens or closes (click, Escape, link)
    if (menu && 'MutationObserver' in window) {
      new MutationObserver(update).observe(menu, { attributes: true, attributeFilter: ['class'] });
    }
    update();
  }

  // ===========================================
  // Contact: show an estimate handed over from the cost estimator
  // (main.js fills the hidden fields; this only presents them)
  // ===========================================

  function initHandoff() {
    const box = document.querySelector('[data-handoff]');
    if (!box || !document.getElementById('contact-form')) return;
    let q = window.location.search.replace(/^\?/, '');
    if (!q && window.location.hash.indexOf('?') > -1) q = window.location.hash.split('?')[1] || '';
    if (!q) return;
    const params = new URLSearchParams(q);
    const total = parseInt(params.get('monthly_total'), 10);
    if (!Number.isFinite(total) || total <= 0) return;
    const drivers = parseInt(params.get('drivers'), 10);
    const vehicles = parseInt(params.get('vehicles'), 10);
    const plural = function (n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); };
    box.querySelector('[data-handoff-total]').textContent = '$' + total.toLocaleString('en-US');
    const meta = [];
    if (Number.isFinite(drivers) && drivers > 0) meta.push(plural(drivers, 'driver'));
    if (Number.isFinite(vehicles) && vehicles > 0) meta.push(plural(vehicles, 'vehicle'));
    box.querySelector('[data-handoff-meta]').textContent = meta.join(', ');
    box.hidden = false;
  }

  // ===========================================
  // About: the story spine draws with the reader; chapter stops light as reached
  // ===========================================

  function initStory() {
    const story = document.querySelector('[data-story]');
    if (!story) return;
    const stops = Array.from(story.querySelectorAll('[data-chap]'));
    function update() {
      const line = window.innerHeight * 0.62;
      const r = story.getBoundingClientRect();
      const p = reduce.matches ? 1 : Math.min(Math.max((line - r.top) / r.height, 0), 1);
      // read every stop first, then write, so a scroll frame costs one layout
      const lit = stops.map(function (k) { return reduce.matches || k.getBoundingClientRect().top + 11 < line; });
      story.style.setProperty('--sp', p.toFixed(4));
      stops.forEach(function (k, i) { k.classList.toggle('is-lit', lit[i]); });
    }
    const tick = onFrame(update);
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    update();
  }

  // ===========================================
  // Contact: a group's stop fills once its required fields have something in them
  // ===========================================

  function initFormRail() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const groups = Array.from(form.querySelectorAll('[data-fgroup]'));
    function check() {
      groups.forEach(function (g) {
        const req = Array.from(g.querySelectorAll('[required]'));
        const fields = req.length ? req : Array.from(g.querySelectorAll('input, select, textarea'));
        const done = req.length
          ? req.every(function (f) { return f.value.trim() !== ''; })
          : fields.some(function (f) { return f.value.trim() !== ''; });
        g.classList.toggle('is-complete', done);
      });
    }
    form.addEventListener('input', check);
    form.addEventListener('change', check);
    window.addEventListener('load', check);
    check();
  }

  function init() {
    initHeaderSurface();
    initFormRail();
    initStory();
    initHandoff();
    initHero();
    initShift();
    initDrawn();
    initBranch();
    initEstimator();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
