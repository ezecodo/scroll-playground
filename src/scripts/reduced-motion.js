// Reduced motion gate — exported as a module-level constant so the other
// scripts can short-circuit instead of registering animations they'll never run.
// We read it once at load; we don't subscribe to changes because GSAP/Lenis
// don't support hot-reconfig cleanly and a reload is cheaper than the complexity.

export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Coarse pointer check — proxy for touch devices. Lenis on iOS Safari is rough,
// so we keep native scrolling on touch.
export const isTouch =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;
