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
    var stops = Array.prototype.slice.call(hero.querySelectorAll('.ln-stop'));
    var nodes = stops.map(function (s) { return s.querySelector('.ln-stop__node'); });
    var title = hero.querySelector('.ln-snap__title');
    var term = hero.querySelector('.ln-term');
    var termNode = hero.querySelector('.ln-term__node');
    var heroGeo = null;
    var heroDone = false;

    var heroWide = window.matchMedia('(min-width: 1024px)');

    var buildHero = function () {
      var legX = box(nodes[0], hero).cx;
      var t = box(termNode, hero);
      // wide: the route drops in from under the header; narrow: it starts at the snapshot title
      var y0 = heroWide.matches ? 0 : box(title, hero).y + 2;
      var d = 'M' + legX + ',' + y0 + ' V' + t.cy;
      var len = t.cy - y0;

      hero.style.setProperty('--ln-leg', legX + 'px');
      hero.style.setProperty('--ln-text-x', box(hero.querySelector('.ln-hero__text'), hero).x + 'px');
      track.setAttribute('d', d);
      line.setAttribute('d', d);
      heroGeo = {
        len: len,
        marks: nodes.map(function (n) { return (box(n, hero).cy - y0) / len; })
      };
      if (heroDone) clearDash(line);
    };

    var finishHero = function () {
      heroDone = true;
      stops.forEach(function (s) { s.classList.add('is-reached'); });
      term.classList.add('is-reached');
      hero.classList.add('is-complete');
      clearDash(line);
    };

    var runHero = function () {
      buildHero();
      if (reduce) { finishHero(); return; }
      var L = heroGeo.len;
      var reached = [];
      setDash(line, L, L);
      tween(1250, easeOut, function (p) {
        line.style.strokeDashoffset = L * (1 - p);
        heroGeo.marks.forEach(function (m, i) {
          if (p >= m && !reached[i]) { reached[i] = true; stops[i].classList.add('is-reached'); }
        });
      }, finishHero);
    };

    var startHero = function () {
      if (startHero.done) return;
      startHero.done = true;
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

  /* ---------------- CHALLENGE -> SOLUTION ---------------- */
  var flow = document.querySelector('[data-ln-flow]');

  if (flow) {
    var link = flow.querySelector('.ln-flow__path');
    var cItems = Array.prototype.slice.call(flow.querySelectorAll('[data-ln-challenge] .ln-pt'));
    var sItems = Array.prototype.slice.call(flow.querySelectorAll('[data-ln-solution] .ln-pt'));
    var sHead = flow.querySelector('.ln-sec--solution .ln-head');
    var sStrip = flow.querySelector('[data-ln-solution]');
    var linkLen = 0;
    var linkDone = reduce;
    var resolved = false;
    var managed = false;
    var stripSeen = false;

    var buildLink = function () {
      var c = box(cItems[cItems.length - 1].querySelector('.ln-mark'), flow);
      var d;
      if (wide.matches) {
        // U-turn down the right margin, from the challenge line's end to the solution line's end
        var s = box(sItems[3].querySelector('.ln-mark'), flow);
        var x = c.right;
        var R = 32;
        d = 'M' + x + ',' + c.y +
            ' A' + R + ',' + R + ' 0 0 1 ' + (x + R) + ',' + (c.y + R) +
            ' V' + (s.y - R) +
            ' A' + R + ',' + R + ' 0 0 1 ' + s.right + ',' + s.y;
        linkLen = (s.y - c.y - 2 * R) + Math.PI * R;
      } else {
        // straight down the spine, across the seam
        var first = box(sItems[0].querySelector('.ln-mark'), flow);
        d = 'M' + c.x + ',' + c.bottom + ' V' + first.y;
        linkLen = first.y - c.bottom;
      }
      link.setAttribute('d', d);
      if (linkDone) clearDash(link);
      else setDash(link, linkLen, linkLen);
    };

    var manage = function () {
      if (managed || !linkDone || !stripSeen) return;
      managed = true;
      if (wide.matches) {
        // the line continues right-to-left from where the connector lands
        for (var k = 0; k < 4; k++) {
          (function (j, delay) {
            window.setTimeout(function () {
              sItems[j].classList.add('is-on');
              sItems[j + 4].classList.add('is-on');
            }, delay);
          })(3 - k, k * 170);
        }
      } else {
        // narrow: each stop comes on as it scrolls into view
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); }
            });
          }, { rootMargin: '0px 0px -18% 0px' });
          sItems.forEach(function (el) { io.observe(el); });
        } else {
          sItems.forEach(function (el) { el.classList.add('is-on'); });
        }
      }
    };

    var resolve = function () {
      if (resolved) return;
      resolved = true;
      flow.classList.add('is-resolved');
      window.setTimeout(function () {
        tween(380, easeInOut, function (p) {
          link.style.strokeDashoffset = linkLen * (1 - p);
        }, function () {
          linkDone = true;
          clearDash(link);
          manage();
        });
      }, 420);
    };

    var startFlow = function () {
      if (startFlow.done) return;
      startFlow.done = true;
      buildLink();
      if (reduce || !('IntersectionObserver' in window)) {
        // static story: challenge stays broken, solution stays covered
        linkDone = true;
        clearDash(link);
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
})();
