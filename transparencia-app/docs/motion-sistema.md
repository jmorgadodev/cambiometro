# Sistema de movimiento de El Cambiómetro

Documento de continuidad: describe cómo se anima el producto hoy, qué se
agregó en el último pase (skill emilkowalski-motion) y qué reglas seguir
para cualquier motion futura. Léelo antes de tocar animaciones.

## Principio rector

- Todo movimiento existe para **aclarar estado o jerarquía**, nunca para
  decorar. Preferir `transform` y `opacity`; no animar `top`, `left`,
  `width`, `height` (salvo casos ya existentes documentados abajo).
- Toda automatización/scroll/montaje que mueva en un eje lleva fallback
  `prefers-reduced-motion`.
- Un lenguaje único: curvas `cubic-bezier(0.4, 0, 0.2, 1)` (interacción)
  y `cubic-bezier(0.2, 0, 0, 1)` (entradas). Sin físicas mezcladas.
- Sin loops eternos salvo que comuniquen estado (`.live-dot`).

## Piezas existentes (componentes cliente)

| Componente | Uso | Notas |
|---|---|---|
| `components/PageEntrance.tsx` | Fade de toda página vía `layout.tsx` | Solo opacity 0.45s; se anula con reduced-motion |
| `components/Reveal.tsx` | Reveal on scroll de secciones (home) | IntersectionObserver; si ya está en viewport muestra de inmediato; reduced-motion => mostrar |
| `components/StatCounter.tsx` | Count-up de cifras (home) | 900 ms + delay*, ease cúbico; no anima con reduced-motion |
| `components/SiteHeader.tsx` | Menú móvil + toggle de tema | Solo estado CSS, sin keyframes |

## Momentos agregados en el último pase (emilkowalski-motion)

Solo dos, de alto valor y bajo riesgo. Ambos gateados por
`prefers-reduced-motion`.

1. **Crecimiento de barras de datos al montar** — `.data-bar__fill` en
   `app/globals.css`. Las barras son inline-width renderizadas en el
   servidor, así que la transición de `width` nunca se disparaba en el
   primer pintado (arrancaban ya llenas). Ahora usan:
   - `transform-origin: left center`
   - `transform: scaleX(0 → 1)` vía `@keyframes data-bar-grow` (0.6s,
     `cubic-bezier(0.4,0,0.2,1)`, `both`)
   - Se mantiene la `transition: width 0.6s` para animar cambios
     posteriores de datos (React re-render).
   - Reduced-motion: la regla existente ahora incluye
     `.data-bar__fill { animation: none }`.

   Esto uniforma el comportamiento con `hist-bar__seg--grow` (historial
   de votaciones), que ya crecía de 0 a su ancho.

2. **Entrada del buscador global** — `.header-search__results` en
   `app/globals.css`. El dropdown aparecía sin transición. Ahora entra
   con fade + `translateY(-4px)` (160 ms, `cubic-bezier(0.2,0,0,1)`,
   `both`, `transform-origin: top center`) vía `@keyframes header-search-in`.

## Dónde NO hay que agregar motion

- Héroes y mastheads: sin coreografías ni parallax (regla del proyecto,
  plan.md §Animación).
- Tablas de datos: separadores escasos y hover de fila (`.hover-row`) ya
  son el único feedback permitido.
- Barras/segmentos que ya animan (hist-bar): no duplicar keyframes.

## Reglas para el siguiente agente

1. Nuevos micro-feedback: ≤ 200 ms para hover y ≤ 500 ms para cambios de
   estado en general; entradas de panel 200–300 ms.
2. Cada `@keyframes` nuevo con movimiento en un eje debe añadirse al
   bloque `@media (prefers-reduced-motion: reduce)` correspondiente.
3. Nunca animar propiedades de layout (`width/height/top/left`) en
   componentes nuevos; usar `transform`/`opacity`.
4. Antes de un nuevo reveal on scroll, verificar que existe
   `components/Reveal.tsx`; reutilizarlo.
5. No introducir librerías de animación (GSAP y similares) sin
   aprobación: el CSS + pequeños hooks alcanzan.

## Verificación tras tocar motion

- `npm run typecheck`
- `npm run build` (sin errores)
- Comprobación visual en `localhost:3000`: buscador (dropdown) y fichas
  con barras de gasto / votaciones (crecimiento) con y sin
  reduced-motion (DevTools → Rendering → Emulate prefers-reduced-motion).

## Estado al cierre de este pase

- typecheck OK, build OK (359 páginas).
- Sin librerías externas de animación.
- Sin cambios de layout/copys: solo `app/globals.css` (motion) y este
  documento.