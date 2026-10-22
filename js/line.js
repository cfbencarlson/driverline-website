/* DriverLine — Concept 2 "The Line": route geometry + state sequencing.
   Content is always visible; this script only draws the line and
   advances its state. Without JS, stops render complete and static. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 1080px)');

  function box(el, base) {
    var r = el.getBoundingClientRect();
    var b = base.getBoundingClientRect();
    return {
      x: r.left - b.left,
      y: r.top - b.top,
      right: r.right - b.left,
      bottom: r.bottom - b.top,
      cx: r.left - b.left + r.width / 2,
      cy: r.top - b.top + r.height / 2
    };
  }

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  function tween(duration, ease, frame, done) {
    var start = null;
    function step(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / duration);
      frame(ease(p));
      if (p < 1) window.requestAnimationFrame(step);
      else if (done) done();
    }
    window.requestAnimationFrame(step);
  }

  function setDash(path, len, offset) {
    path.style.strokeDasharray = len + ' ' + len;
    path.style.strokeDashoffset = offset;
  }

  function clearDash(path) {
    path.style.strokeDasharray = 'none';
    path.style.strokeDashoffset = '0';
  }

  /* ---------------- HERO ---------------- */
  var hero = document.querySelector('[data-ln-hero]');

  if (hero) {
    var track = hero.querySelector('.ln-hero__track');
    var line = hero.querySelector('.ln-hero__line');
    var glow = hero.querySelector('.ln-hero__glow');
    var lit = glow ? [line, glow] : [line];
    var stops = Array.prototype.slice.call(hero.querySelectorAll('.ln-stop'));
    var nodes = stops.map(function (s) { return s.querySelector('.ln-stop__node'); });
    var title = hero.querySelector('.ln-snap__title');
    var term = hero.querySelector('.ln-term');
    var termNode = hero.querySelector('.ln-term__node');
    var heroGeo = null;
    var heroDone = false;
    var heroRunning = false;

    var heroWide = window.matchMedia('(min-width: 1024px)');

    var buildHero = function () {
      var legX = box(nodes[0], hero).cx;
      var t = box(termNode, hero);
      // wide: the route drops in from under the header; narrow: it starts at the snapshot title
      var y0 = heroWide.matches ? 0 : box(title, hero).y + 2;
      var d = 'M' + legX + ',' + y0 + ' V' + t.cy;
      var len = t.cy - y0;

      hero.style.setProperty('--ln-leg', legX + 'px');
      hero.style.setProperty('--ln-term-y', t.cy + 'px');
      hero.style.setProperty('--ln-text-x', box(hero.querySelector('.ln-hero__text'), hero).x + 'px');
      track.setAttribute('d', d);
      lit.forEach(function (p) { p.setAttribute('d', d); });
      heroGeo = {
        len: len,
        marks: nodes.map(function (n) { return (box(n, hero).cy - y0) / len; })
      };
      lit.forEach(function (p) {
        if (heroDone) clearDash(p);
        else if (!heroRunning) setDash(p, len, len);
      });
    };

    var finishHero = function () {
      heroDone = true;
      stops.forEach(function (s) { s.classList.add('is-reached'); });
      term.classList.add('is-reached');
      hero.classList.add('is-complete');
      lit.forEach(clearDash);
    };

    var runHero = function () {
      buildHero();
      if (reduce) { finishHero(); return; }
      heroRunning = true;
      var L = heroGeo.len;
      var reached = [];
      lit.forEach(function (path) { setDash(path, L, L); });
      tween(1250, easeOut, function (p) {
        lit.forEach(function (path) { path.style.strokeDashoffset = L * (1 - p); });
        heroGeo.marks.forEach(function (m, i) {
          if (p >= m && !reached[i]) { reached[i] = true; stops[i].classList.add('is-reached'); }
        });
      }, finishHero);
    };

    var startHero = function () {
      if (startHero.done) return;
      startHero.done = true;
      // narrow: the snapshot sits below the fold, so the route waits until
      // its last row (Coverage Ready) is on screen and the whole sequence is seen
      if (!reduce && !heroWide.matches && term && 'IntersectionObserver' in window) {
        buildHero();
        var heroIo = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { heroIo.disconnect(); runHero(); }
        }, { threshold: 0.9 });
        heroIo.observe(term);
        return;
      }
      runHero();
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startHero);
      window.setTimeout(startHero, 1200);
    } else {
      startHero();
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { if (heroGeo) buildHero(); }).observe(hero);
    }
  }

  /* ---------------- CHALLENGE -> SOLUTION ----------------
     Wide: the resolved challenge line turns down and fades out;
     the solution line fades in from above and turns into its row.
     The seam between them is implied, not drawn.
     Narrow: one spine, straight down the gutter, across the seam. */
  var flow = document.querySelector('[data-ln-flow]');

  if (flow) {
    var exit = flow.querySelector('.ln-flow__path--exit');
    var entry = flow.querySelector('.ln-flow__path--entry');
    var gOut = flow.querySelector('#ln-fade-out');
    var gIn = flow.querySelector('#ln-fade-in');
    var cItems = Array.prototype.slice.call(flow.querySelectorAll('[data-ln-challenge] .ln-pt'));
    var sItems = Array.prototype.slice.call(flow.querySelectorAll('[data-ln-solution] .ln-pt'));
    var sHead = flow.querySelector('.ln-sec--solution .ln-head');
    var sStrip = flow.querySelector('[data-ln-solution]');
    var exitLen = 0;
    var entryLen = 0;
    var exitDone = reduce;
    var entryDone = reduce;
    var resolved = false;
    var managed = false;
    var stripSeen = false;

    var R = 24;
    var RUN = 88;

    var buildLink = function () {
      var c = box(cItems[cItems.length - 1].querySelector('.ln-mark'), flow);
      if (wide.matches) {
        var s = box(sItems[3].querySelector('.ln-mark'), flow);
        var x = c.right;
        // the exit leaves through the challenge section's bottom edge
        var cSec = box(flow.querySelector('.ln-sec--challenge'), flow);
        var exitEnd = Math.max(c.y + R + RUN, cSec.bottom - 2);
        var entryStart = s.y - R - RUN;
        exit.setAttribute('d', 'M' + x + ',' + c.y + ' A' + R + ',' + R + ' 0 0 1 ' + (x + R) + ',' + (c.y + R) + ' V' + exitEnd);
        entry.setAttribute('d', 'M' + (s.right + R) + ',' + entryStart + ' V' + (s.y - R) + ' A' + R + ',' + R + ' 0 0 1 ' + s.right + ',' + s.y);
        gOut.setAttribute('y1', c.y + R * 0.5); gOut.setAttribute('y2', exitEnd);
        gIn.setAttribute('y1', entryStart); gIn.setAttribute('y2', s.y - R * 0.5);
        exit.style.stroke = 'url(#ln-fade-out)';
        entry.style.stroke = 'url(#ln-fade-in)';
        exitLen = (Math.PI * R) / 2 + (exitEnd - c.y - R);
        entryLen = RUN + (Math.PI * R) / 2;
      } else {
        var first = box(sItems[0].querySelector('.ln-mark'), flow);
        exit.setAttribute('d', 'M' + c.x + ',' + c.bottom + ' V' + first.y);
        exit.style.stroke = '';
        entry.setAttribute('d', '');
        exitLen = first.y - c.bottom;
        entryLen = 0;
      }
      if (exitDone) clearDash(exit); else setDash(exit, exitLen, exitLen);
      if (entryDone) clearDash(entry); else setDash(entry, entryLen, entryLen);
    };

    var drawPath = function (path, len, ms, done) {
      tween(ms, easeInOut, function (p) { path.style.strokeDashoffset = len * (1 - p); }, function () {
        clearDash(path);
        if (done) done();
      });
    };

    var lightSolution = function () {
      if (wide.matches) {
        // the line carries on right-to-left from where the entry lands
        for (var k = 0; k < 4; k++) {
          (function (j, delay) {
            window.setTimeout(function () {
              sItems[j].classList.add('is-on');
              sItems[j + 4].classList.add('is-on');
            }, delay);
          })(3 - k, k * 170);
        }
      } else if ('IntersectionObserver' in window) {
        // narrow: each stop comes on as it scrolls into view
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); }
          });
        }, { rootMargin: '0px 0px -18% 0px' });
        sItems.forEach(function (el) { io.observe(el); });
      } else {
        sItems.forEach(function (el) { el.classList.add('is-on'); });
      }
    };

    var manage = function () {
      if (managed || !exitDone || !stripSeen) return;
      managed = true;
      if (entryLen > 0) {
        drawPath(entry, entryLen, 320, function () { entryDone = true; lightSolution(); });
      } else {
        entryDone = true;
        lightSolution();
      }
    };

    var resolve = function () {
      if (resolved) return;
      resolved = true;
      flow.classList.add('is-resolved');
      window.setTimeout(function () {
        drawPath(exit, exitLen, 340, function () { exitDone = true; manage(); });
      }, 420);
    };

    var startFlow = function () {
      if (startFlow.done) return;
      startFlow.done = true;
      buildLink();
      if (reduce || !('IntersectionObserver' in window)) {
        // static story: challenge stays broken, solution stays covered
        exitDone = entryDone = true;
        clearDash(exit);
        clearDash(entry);
        return;
      }
      flow.classList.add('is-armed');

      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { resolve(); obs.disconnect(); }
      }, { rootMargin: '0px 0px -25% 0px' }).observe(sHead);

      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { stripSeen = true; manage(); obs.disconnect(); }
      }, { threshold: 0.25 }).observe(sStrip);
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startFlow);
      window.setTimeout(startFlow, 1200);
    } else {
      startFlow();
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { if (startFlow.done) buildLink(); }).observe(flow);
    }
    wide.addEventListener('change', function () { if (startFlow.done) buildLink(); });
  }

  /* ---------- ONE-TIME ARRIVAL STATES ----------
     Section markers and the estimator sheet settle into their state
     once, when they first come into view. CSS owns what changes. */
  var seen = Array.prototype.slice.call(document.querySelectorAll('[data-ln-seen]'));

  if (seen.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      seen.forEach(function (el) { el.classList.add('is-seen'); });
    } else {
      var seenIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-seen'); seenIo.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      seen.forEach(function (el) { seenIo.observe(el); });
    }
  }
})();
