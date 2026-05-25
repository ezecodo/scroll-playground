# Scroll Playground

Laboratorio personal para aprender scroll cinematográfico al nivel de
Shopify Editions / Linear / Stripe Press. Construido con **Astro 5 + Lenis +
GSAP ScrollTrigger** y Tailwind v4. Sin frameworks de componentes, vanilla JS
puro en los `<script>`.

Cada sección demuestra **una sola técnica** — la idea es leer un módulo,
entenderlo, y después tocarle los números para ver qué pasa.

---

## Las 6 secciones

| #  | Técnica                     | Archivo                        | API clave                          |
|----|-----------------------------|--------------------------------|------------------------------------|
| 01 | Scrubbed hero               | `HeroScrub.astro`              | `gsap.timeline({ scrub: 1 })`      |
| 02 | Grid stagger reveal         | `GridStagger.astro`            | `ScrollTrigger.batch()`            |
| 03 | Typographic parallax        | `ParallaxType.astro`           | `gsap.fromTo({ scrub: true })`     |
| 04 | Pin + horizontal scroll     | `PinHorizontal.astro`          | `ScrollTrigger.pin + invalidate`   |
| 05 | CSS-only infinite marquee   | `MarqueeLoop.astro`            | `@keyframes` + `translate3d(-50%)` |
| 06 | Footer curtain reveal       | `FooterCurtain.astro`          | `position: fixed` + scrubbed yPercent |

---

## Instalación paso a paso

```bash
# 1. Entrá al directorio
cd playground-scroll

# 2. Instalá dependencias (npm | pnpm | bun da igual)
npm install

# 3. Levantá dev server (Astro lo expone en :4321 por defecto)
npm run dev

# 4. Producción
npm run build
npm run preview
```

Si querés inicializar desde cero con el create command oficial y después
copiar estos archivos:

```bash
npm create astro@latest -- --template minimal --typescript strict
npm install lenis gsap
npm install -D tailwindcss @tailwindcss/vite
```

---

## Cómo extenderlo — 5 ideas concretas

1. **SplitText character-by-character en el hero**
   Reemplazá los `<span data-hero-word>` por caracteres individuales generados
   con la nueva API gratuita `SplitText` (incluida en GSAP 3.13+).
   Animá `chars` en vez de `words` con stagger 0.02. Vas a tener que matar
   ligaduras y kerning, pero queda muy cinematográfico.
   **API**: `SplitText.create(el, { type: 'chars,words' })`.

2. **Image reveal con `clip-path`**
   Una sección extra con imágenes editoriales que se revelan con un
   `clip-path: inset(0 100% 0 0)` animado a `inset(0 0 0 0)` cuando entran al
   viewport. Importante: clip-path SÍ es animable performante (a diferencia
   de `width`).
   **API**: `gsap.to({ clipPath, scrollTrigger: { start: 'top 70%' } })`.

3. **Cursor custom magnético en links**
   Un círculo que sigue al cursor con `gsap.quickTo()` (la API más rápida para
   updates de propiedades, evita el costo de `gsap.to()` por frame). En hover
   sobre `<a>`, el círculo se "imanta" al centro del link.
   **API**: `gsap.quickTo(el, 'x', { duration: 0.4, ease: 'expo.out' })`.

4. **Scroll progress bar con `gsap.to()` infinito**
   Una barrita arriba del todo que crece de 0 a 100% según `scrollTrigger`
   sobre `document.documentElement`. Una sola línea de GSAP, pero enseña el
   patrón de "scrubear sobre toda la página".
   **API**: `ScrollTrigger.create({ trigger: ..., onUpdate: self => bar.style.scaleX = self.progress })`.

5. **Sección con SVG path drawing**
   Trazá líneas SVG (un mapa, un logo, una ilustración) animando
   `stroke-dashoffset` de la longitud total a 0 con scrub. Es el efecto
   "el dibujo se dibuja solo" sin librerías raras.
   **API**: `DrawSVGPlugin` (también gratis ahora) o vanilla con
   `getTotalLength()` + `setProperty`.

---

## Errores comunes y cómo evitarlos

### 1. "El scroll se siente saltón cuando uso Lenis con ScrollTrigger"
**Causa**: dos loops RAF compitiendo. Lenis tiene su `requestAnimationFrame`
interno y GSAP tiene el suyo (`gsap.ticker`).
**Fix**: matá el RAF interno de Lenis y dejá que `gsap.ticker.add()` llame a
`lenis.raf(time * 1000)`. Es exactamente lo que hace `lenis-init.js` en este
proyecto. Si ves que copiás código de un tutorial que llama `requestAnimationFrame(raf)`
para Lenis y APARTE configura ScrollTrigger, ese tutorial está desactualizado.

### 2. "El pin horizontal mide mal después de redimensionar la ventana"
**Causa**: el `end` se calcula una sola vez al crear el ScrollTrigger, así que
si el viewport cambia, las distancias no se recalculan.
**Fix**: pasale `end` y `x` como **funciones** (no como valores) y agregá
`invalidateOnRefresh: true`. Cuando ScrollTrigger se refresque (por resize,
font load, etc.), va a re-ejecutar esas funciones. En este repo lo hacemos
en `PinHorizontal` → `scroll-animations.js`.

### 3. "Las animaciones aparecen 'flasheadas' al cargar la página"
**Causa**: el HTML renderiza con el estado natural antes de que GSAP corra
`gsap.set()` para esconder los elementos. El usuario ve el contenido →
desaparece → reaparece animado.
**Fix combinado**:
- Aplicá el estado inicial **también en CSS** para elementos críticos
  (`opacity: 0`) cuando puedas.
- Mantené el `body.is-loading` con `opacity: 0` y removelo solo después
  de `ScrollTrigger.refresh()`. Es lo que hace `lenis-init.js` con dos
  RAFs anidados — uno para layout, otro para que ScrollTrigger calcule
  posiciones con el layout final.

---

## Próximo nivel — qué aprender después

Una vez que te sientas cómodo con esto, hay tres caminos:

### → Three.js (la base de todo lo 3D en web)
Si querés sumar profundidad real (no parallax simulada): partículas que
reaccionan al scroll, shaders custom para distorsionar imágenes, WebGL puro.
Empezá con [Three.js Journey](https://threejs-journey.com/) o el threejs.org
fundamentals. Vas a aprender qué es un mesh, un material, una cámara —
conceptos que después se traducen a cualquier engine.

**Cuándo lo necesitás**: cuando ves un sitio Awwwards SOTD con efectos
que NO podés explicar mirando el DOM.

### → React Three Fiber (R3F)
Three.js es imperativo. R3F lo hace declarativo en React. Si ya manejás
React (como vos), saltar a R3F es mucho más natural que Three.js puro.
Combina muy bien con drei (helpers) y leva (controles de dev).

**Cuándo lo necesitás**: cuando quieras componentizar escenas 3D y
tener hot-reload + state management normal.

**Trade-off**: este playground es Astro vanilla a propósito —
querías escapar de React por un rato. R3F implicaría volver al ecosistema
React + un bundle pesado. Considéralo solo cuando el proyecto sea
genuinamente 3D-first.

### → Rive
Animaciones vectoriales con state machine (como Lottie pero infinitamente
más expresivo y con interactividad nativa). Te permite delegar la animación
al diseñador en su propio editor, en lugar de orquestarla con código.
Rive tiene runtime JS muy liviano y reacciona a inputs en tiempo real.

**Cuándo lo necesitás**: micro-interacciones complejas (un botón que
"piensa", una ilustración que reacciona al cursor) donde codear cada
frame en GSAP sería un infierno.

### Bonus: WebGL shaders sin Three
[OGL](https://github.com/oframe/ogl) (~10kb) o
[twgl](https://twgljs.org/) (~7kb). Más cerca del metal, mejor para
playgrounds didácticos. Si te interesa entender qué hace una GPU,
saltátelos a fragment shaders directamente.

---

## Stack técnico — decisiones

- **Astro 5** → cero JS por defecto. Los scripts se cargan solo cuando hacen
  falta. Para una landing como esta, perfect fit.
- **Lenis ≥ 1.1** → smooth scroll moderno. Funciona con scroll nativo del body
  (no fake-scroll como Locomotive v4), así que ScrollTrigger lee `scrollY`
  directo sin proxies.
- **GSAP 3.12+** → ScrollTrigger es ahora completamente gratis (incluido
  SplitText, MorphSVG, DrawSVG desde la adquisición de Webflow en 2024).
- **Tailwind v4** → CSS-first (sin config JS pesado), nativo via Vite plugin.
- **Inter + Fraunces** → la dupla de display/UI más versátil de Google Fonts
  hoy. Fraunces tiene ejes variables para soft + opsz que dan rango de display.

---

## Estructura del proyecto

```
playground-scroll/
├── astro.config.mjs
├── package.json
├── tailwind.config.mjs        (stub — config real está en global.css)
├── tsconfig.json
├── README.md
└── src/
    ├── pages/index.astro
    ├── layouts/Layout.astro
    ├── components/
    │   ├── SideNav.astro
    │   ├── HeroScrub.astro
    │   ├── GridStagger.astro
    │   ├── ParallaxType.astro
    │   ├── PinHorizontal.astro
    │   ├── MarqueeLoop.astro
    │   └── FooterCurtain.astro
    ├── scripts/
    │   ├── reduced-motion.js
    │   ├── lenis-init.js
    │   └── scroll-animations.js
    └── styles/
        ├── tokens.css
        └── global.css
```
