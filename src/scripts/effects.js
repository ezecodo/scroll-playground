// =============================================================
// EFFECTS — page-wide affordances that aren't tied to one section:
//   • atmosphere (clock, scroll counter, room tag, signal drift, flash)
//   • chromatic aberration driven by scroll velocity
//   • text scramble on dossier titles
//   • crosshair cursor + magnetic sidenav
//   • SVG spine that draws itself on scroll
//   • marquee speed reactive to scroll velocity
//   • glitch wobble on tagged labels
//   • nav scramble on hover
// All skipped under prefers-reduced-motion (atmosphere clock still runs,
// since reading the time isn't motion).
// =============================================================

import { gsap } from 'gsap';
import { prefersReducedMotion, isTouch } from './reduced-motion.js';

initAtmosphere();
if (!prefersReducedMotion) {
  initChromaticAberration();
  initTextScramble();
  initCursor();
  initSpine();
  initMarqueeVelocity();
  initGlitchWobble();
  initNavScramble();
}

// ===========================================================
// ATMOSPHERE — live clock, scroll counter, room tag, signal, flash
// ===========================================================
function initAtmosphere() {
  const tEl = document.getElementById('sys-time');
  const sEl = document.getElementById('sys-scroll');
  const rEl = document.getElementById('sys-room');
  const sigEl = document.getElementById('sys-sig');
  const flashEl = document.getElementById('flash');

  // Clock — 4×/sec is enough; tabular-nums prevents jitter
  if (tEl) {
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      tEl.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    };
    tick();
    setInterval(tick, 250);
  }

  // Scroll counter — single rAF debounce
  if (sEl) {
    let raf = false;
    window.addEventListener(
      'scroll',
      () => {
        if (raf) return;
        raf = true;
        requestAnimationFrame(() => {
          sEl.textContent = `${Math.round(window.scrollY)}`.padStart(4, '0') + ' px';
          raf = false;
        });
      },
      { passive: true },
    );
  }

  // Active room + body class for room-aware CSS (e.g. hide bottom chrome
  // while hero owns its own progress band)
  const sections = document.querySelectorAll('section[data-room]');
  if (sections.length && rEl) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.target.dataset.room) {
            rEl.textContent = e.target.dataset.room;
            document.body.className = document.body.className
              .split(' ')
              .filter((c) => !c.startsWith('room-'))
              .concat('room-' + e.target.id)
              .join(' ');
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    sections.forEach((s) => io.observe(s));
  }

  // Signal indicator — cycles through arbitrary glyph states
  if (sigEl) {
    const states = ['●●●●●○', '●●●●○○', '●●●●●●', '●●●○○○', '●●●●●○'];
    let si = 0;
    setInterval(() => {
      si = (si + 1) % states.length;
      sigEl.textContent = states[si];
    }, 3200);
  }

  // Occasional amber flash — every 9-16s, ~170ms total
  if (flashEl && !prefersReducedMotion) {
    function scheduleFlash() {
      const wait = 9000 + Math.random() * 7000;
      setTimeout(() => {
        gsap.to(flashEl, {
          opacity: 0.18,
          duration: 0.05,
          ease: 'none',
          onComplete: () =>
            gsap.to(flashEl, { opacity: 0, duration: 0.12, ease: 'none' }),
        });
        scheduleFlash();
      }, wait);
    }
    scheduleFlash();
  }
}

// ===========================================================
// CHROMATIC ABERRATION — driven by Lenis velocity.
// Each frame: read velocity → clamp → low-pass → write --aberration.
// CSS .chrom uses it as a text-shadow split (cyan/red).
// ===========================================================
function initChromaticAberration() {
  const root = document.documentElement;
  const setter = gsap.quickSetter(root, '--aberration');
  let value = 0;

  gsap.ticker.add(() => {
    const v = (window.lenis && window.lenis.velocity) || 0;
    // Normalize aggressively + clamp to ±8px max split
    const target = Math.max(-8, Math.min(8, v / 220));
    // Exponential smoothing — coefficient 0.18 tuned for "elastic" feel
    value += (target - value) * 0.18;
    setter(value);
  });
}

// ===========================================================
// TEXT SCRAMBLE — exposed on window.__scramble for reuse by
// the sidenav hover effect.
// ===========================================================
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

function scrambleEl(el, opts = {}) {
  const { total = 28, restoreHTML = true, reset = false } = opts;
  if (!reset && el.dataset.scrambling === '1') return;
  el.dataset.scrambling = '1';

  // Cache original markup once — we restore it at the end so
  // <em> styling survives the scramble.
  const originalHTML = el.dataset.scrambleHTML || (el.dataset.scrambleHTML = el.innerHTML);
  const plain = el.dataset.scramblePlain || (el.dataset.scramblePlain = el.textContent);
  let frame = 0;

  function tick() {
    const progress = frame / total;
    const revealed = Math.floor(plain.length * progress);
    let out = '';
    for (let i = 0; i < plain.length; i++) {
      const c = plain[i];
      if (i < revealed)      out += c;
      else if (c === ' ')    out += ' ';
      else                   out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    el.textContent = out;
    frame++;
    if (frame > total) {
      if (restoreHTML) el.innerHTML = originalHTML;
      else el.textContent = plain;
      el.dataset.scrambling = '0';
      return;
    }
    requestAnimationFrame(tick);
  }
  tick();
}
window.__scramble = scrambleEl;

function initTextScramble() {
  const targets = document.querySelectorAll('[data-scramble]');
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.target.dataset.scrambled !== '1') {
          e.target.dataset.scrambled = '1';
          scrambleEl(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );
  targets.forEach((el) => io.observe(el));
}

// ===========================================================
// CURSOR — crosshair + magnetic sidenav.
// quickTo is ~10x faster than gsap.to for per-frame writes.
// ===========================================================
function initCursor() {
  if (isTouch) return;

  const cursor = document.getElementById('cursor');
  const coords = document.getElementById('cursor-coords');
  if (!cursor) return;

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.22, ease: 'expo.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.22, ease: 'expo.out' });

  let mx = 0, my = 0, ready = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX; my = e.clientY; ready = true;
      xTo(mx); yTo(my);
      if (coords) {
        coords.textContent =
          String(Math.round(mx)).padStart(4, '0') + '/' +
          String(Math.round(my)).padStart(4, '0');
      }
    },
    { passive: true },
  );

  // Hover swell on interactive surfaces
  document.querySelectorAll('a, button, .grid-card, [data-cursor="hover"]').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('cursor--hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('cursor--hover'));
  });

  // Hide while pointer is outside the window
  window.addEventListener('pointerleave', () => (cursor.style.opacity = '0'));
  window.addEventListener('pointerenter', () => (cursor.style.opacity = '1'));

  // Magnetic sidenav — each link gets its own pair of quickTo's
  // so per-link lerps don't fight across elements.
  const links = Array.from(document.querySelectorAll('.sidenav a'));
  const RADIUS = 90;
  const STRENGTH = 0.42;
  const setters = new Map();
  links.forEach((link) => {
    setters.set(link, {
      x: gsap.quickTo(link, 'x', { duration: 0.45, ease: 'expo.out' }),
      y: gsap.quickTo(link, 'y', { duration: 0.45, ease: 'expo.out' }),
    });
  });

  gsap.ticker.add(() => {
    if (!ready) return;
    links.forEach((link) => {
      const r = link.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.hypot(dx, dy);
      const s = setters.get(link);
      if (dist < RADIUS) {
        const pull = (1 - dist / RADIUS) * STRENGTH;
        s.x(dx * pull);
        s.y(dy * pull);
        link.classList.add('magnetic-active');
      } else {
        s.x(0);
        s.y(0);
        link.classList.remove('magnetic-active');
      }
    });
  });
}

// ===========================================================
// SPINE — SVG vertical line, drawn via stroke-dashoffset scrub.
// pathLength="100" normalizes the path so progress maps cleanly.
// ===========================================================
function initSpine() {
  const line = document.getElementById('spine-line');
  const cap = document.getElementById('spine-cap');
  if (!line) return;

  // Lazy import ScrollTrigger only when we need it from this script
  import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        line.style.strokeDashoffset = String(100 - self.progress * 100);
        if (cap) {
          cap.style.transform = `translateY(${self.progress * window.innerHeight - 3.5}px)`;
        }
      },
    });
  });
}

// ===========================================================
// MARQUEE VELOCITY — live-mutate animation-duration based on
// scroll velocity. Idle = 40s/cycle, hard scroll → ~12s/cycle.
// Browsers re-target the CSS animation without restart.
// ===========================================================
function initMarqueeVelocity() {
  const marquee = document.querySelector('.marquee');
  if (!marquee) return;
  let smooth = 0;
  gsap.ticker.add(() => {
    const v = Math.abs((window.lenis && window.lenis.velocity) || 0);
    smooth += (v - smooth) * 0.12;
    const factor = 1 + Math.min(2.3, smooth / 1500);
    marquee.style.animationDuration = (40 / factor).toFixed(2) + 's';
  });
}

// ===========================================================
// GLITCH WOBBLE — every 4–9s, scramble a few chars of each
// [data-wobble] element for ~240ms, then restore.
// ===========================================================
function initGlitchWobble() {
  const targets = document.querySelectorAll('[data-wobble]');
  if (!targets.length) return;
  const chars = '!@#$%^&*[]{}<>?/|—=+';

  function wobble(el) {
    const original = el.dataset.wobbleOriginal || (el.dataset.wobbleOriginal = el.textContent);
    let frame = 0;
    const total = 6;
    function tick() {
      if (frame >= total) {
        el.textContent = original;
        return;
      }
      const arr = original.split('');
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== ' ' && Math.random() < 0.14) {
          arr[i] = chars[Math.floor(Math.random() * chars.length)];
        }
      }
      el.textContent = arr.join('');
      frame++;
      setTimeout(tick, 38);
    }
    tick();
  }

  function schedule() {
    const wait = 4000 + Math.random() * 5000;
    setTimeout(() => {
      targets.forEach((t) => wobble(t));
      schedule();
    }, wait);
  }
  schedule();
}

// ===========================================================
// NAV SCRAMBLE on hover — uses the same scrambleEl, only on
// the label span (not the index number).
// ===========================================================
function initNavScramble() {
  document.querySelectorAll('.sidenav a').forEach((link) => {
    const label = link.querySelector('span:last-child');
    if (!label) return;
    link.addEventListener('pointerenter', () => {
      if (window.__scramble) {
        window.__scramble(label, { total: 14, restoreHTML: false, reset: true });
      }
    });
  });
}
