// =============================================================
// LENIS ↔ GSAP integration
// -------------------------------------------------------------
// One RAF loop only: gsap.ticker drives lenis.raf, and Lenis pings
// ScrollTrigger.update on every scroll. No scrollerProxy needed —
// Lenis writes to window.scrollY natively.
// =============================================================

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isTouch } from './reduced-motion.js';

gsap.registerPlugin(ScrollTrigger);

/** @type {Lenis | null} */
let lenis = null;

if (!prefersReducedMotion && !isTouch) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
} else {
  window.addEventListener('resize', () => ScrollTrigger.refresh());
}

// Expose globally so other scripts (effects.js, scroll-animations.js) and
// the sidenav click handler can call scrollTo / read velocity.
window.lenis = lenis;

// Refresh after first paint so all ScrollTriggers compute correct positions.
requestAnimationFrame(() => {
  requestAnimationFrame(() => ScrollTrigger.refresh());
});

export { lenis };
