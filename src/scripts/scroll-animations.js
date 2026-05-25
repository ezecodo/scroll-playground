// =============================================================
// SCROLL ANIMATIONS — one initializer per section.
// Skipped wholesale on prefers-reduced-motion (CSS handles fallback).
// =============================================================

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './reduced-motion.js';

gsap.registerPlugin(ScrollTrigger);

if (!prefersReducedMotion) {
  initHero();
  initGrid();
  initReveals();
  initParallax();
  initPin();
  initCurtain();
  initReadingBar();
}

// SideNav is the only thing that runs even with reduced motion —
// it's pure IO, no animation tied to scroll position.
initSideNav();

// ===========================================================
// 01 — HERO / TRANSMISIÓN
// Scrubbed word reveal (blur 8px → 0). Subtitle lines cross-fade
// at fixed timeline positions. Progress drives the bottom bar.
// ===========================================================
function initHero() {
  const heroWords = gsap.utils.toArray('.hero__title .word');
  const heroLines = gsap.utils.toArray('.hero__sub .line');
  const heroProg  = document.getElementById('hero-prog');
  const heroBar   = document.getElementById('hero-bar');
  if (!heroWords.length) return;

  gsap.set(heroWords, { autoAlpha: 0, filter: 'blur(8px)' });
  gsap.set(heroLines, { autoAlpha: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const pct = Math.round(self.progress * 100);
        if (heroProg) heroProg.textContent = pct;
        if (heroBar)  heroBar.style.setProperty('--prog', pct);
      },
    },
  });

  tl.to(heroWords, {
    autoAlpha: 1,
    filter: 'blur(0px)',
    duration: 1,
    stagger: 0.6,
    ease: 'none',
  }, 0);

  // Subtitle cross-fades at hardcoded timeline positions
  if (heroLines[0]) tl.to(heroLines[0], { autoAlpha: 1, duration: 0.4, ease: 'none' }, 0);
  if (heroLines[0]) tl.to(heroLines[0], { autoAlpha: 0, duration: 0.2, ease: 'none' }, 3.5);
  if (heroLines[1]) tl.to(heroLines[1], { autoAlpha: 1, duration: 0.4, ease: 'none' }, 3.5);
  if (heroLines[1]) tl.to(heroLines[1], { autoAlpha: 0, duration: 0.2, ease: 'none' }, 6.5);
  if (heroLines[2]) tl.to(heroLines[2], { autoAlpha: 1, duration: 0.4, ease: 'none' }, 6.5);
}

// ===========================================================
// 02 — GRID STAGGER
// ===========================================================
function initGrid() {
  const cards = gsap.utils.toArray('.grid-card');
  if (!cards.length) return;

  gsap.set(cards, { y: 50, autoAlpha: 0 });
  gsap.to(cards, {
    y: 0,
    autoAlpha: 1,
    duration: 0.9,
    stagger: 0.08,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.grid',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
  });
}

// Generic .reveal helper — applied to anything with that class.
function initReveals() {
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.fromTo(
      el,
      { y: 24, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
      },
    );
  });
}

// ===========================================================
// 03 — PARALLAX
// Background type drifts upward at -40% as the section traverses
// the viewport. Pure yPercent — never animate top/margin.
// ===========================================================
function initParallax() {
  const bg = document.querySelector('[data-parallax-bg]');
  if (!bg) return;
  gsap.to(bg, {
    yPercent: -40,
    ease: 'none',
    scrollTrigger: {
      trigger: '.parallax',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}

// ===========================================================
// 04 — PIN HORIZONTAL
// Desktop: pin section + translateX track. Mobile: skip (CSS
// flex-direction: column would need to be added; for now panels
// stack via their natural flow if you override .pin-track at
// the mobile breakpoint. Here we just bail on the pin on small).
// ===========================================================
function initPin() {
  ScrollTrigger.matchMedia({
    '(min-width: 769px)': function () {
      const panels = gsap.utils.toArray('.pin-panel');
      const counter = document.getElementById('pin-cur');
      if (!panels.length) return;

      gsap.to('.pin-track', {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: '.pin-wrap',
          start: 'top top',
          end: () => '+=' + (panels.length - 1) * window.innerHeight,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      ScrollTrigger.create({
        trigger: '.pin-wrap',
        start: 'top top',
        end: () => '+=' + (panels.length - 1) * window.innerHeight,
        onUpdate: (self) => {
          if (!counter) return;
          const idx = Math.min(panels.length - 1, Math.floor(self.progress * panels.length));
          counter.textContent = String(idx + 1).padStart(2, '0');
        },
      });
    },
  });
}

// ===========================================================
// 06 — CURTAIN
// Fixed footer rises with scrub. Once progress > 0.6, mark it
// `.active` so links inside become clickable.
// ===========================================================
function initCurtain() {
  const curtain = document.getElementById('curtain');
  if (!curtain) return;
  gsap.to(curtain, {
    yPercent: -100,
    ease: 'expo.out',
    scrollTrigger: {
      trigger: '.outro',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        if (self.progress > 0.6) curtain.classList.add('active');
        else curtain.classList.remove('active');
      },
    },
  });
}

// ===========================================================
// Reading bar — single scrub across documentElement
// ===========================================================
function initReadingBar() {
  const fill = document.getElementById('reading-bar-fill');
  if (!fill) return;
  gsap.to(fill, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    },
  });
}

// ===========================================================
// SIDE NAV — IntersectionObserver, not ScrollTrigger.
// IO is the right primitive for "which section is in view" —
// no scroll-driven animation needed.
// ===========================================================
function initSideNav() {
  const sections = document.querySelectorAll('section[data-section]');
  const links = document.querySelectorAll('.sidenav a');
  if (!sections.length || !links.length) return;

  const byId = {};
  links.forEach((a) => (byId[a.dataset.nav] = a));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((a) => a.classList.remove('active'));
          const id = entry.target.dataset.section;
          if (byId[id]) byId[id].classList.add('active');
        }
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  );
  sections.forEach((s) => io.observe(s));

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      if (window.lenis) window.lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
