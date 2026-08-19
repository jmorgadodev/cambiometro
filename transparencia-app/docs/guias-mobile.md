# Auditoría móvil de El Cambiómetro

Documento de continuidad: registra la verificación de la versión móvil
realizada tras el pase de movimiento (ver `docs/motion-sistema.md`), los
bugs de overflow encontrados y las reglas para no reintroducirlos. Léelo
antes de tocar layout, grids inline o media queries.

## Alcance de la revisión

- Páginas clave en viewports móviles: home, ficha de persona
  (`app/politico/[id]`), listado y ficha de municipalidades, partidos,
  comparador, funcionarios, servicios públicos, metodología y datos.
- Objetivo: sin scroll horizontal, las tablas se desplazan dentro de su
  caja, y los grids de dos columnas apilan a una en pantallas pequeñas.

## Cómo está garantizado el responsive (resumen)

- `app/globals.css` define un bloque `@media (max-width: 768px)` que:
  - apila el header, permite scroll en la nav,
  - convierte `.data-table` en scroll horizontal (`display: block; overflow-x: auto`),
  - apila grids inline de `1fr 340px` y `1fr 360px` a una columna.
- Reglas adicionales por página: `politico-layout` a 850px, home a
  1000/850/700/560px, directorio/tarjetas a 900/700/430px, metodología
  1050/700px, data-hero a 980/640px.
- Las tablas con `min-width` (Ranking de partidos, `minWidth: 900`)
  viven dentro de un wrapper `overflow-x: auto` — se desplazan, nunca
  rompen la página.

## Bugs corregidos en este pase

1. **Ficha de municipalidad desbordaba en ≤768px.**
   `app/municipalidades/[id]/page.tsx` usa grid inline
   `gridTemplateColumns: "1fr 360px"`, y el bloque responsive solo
   apilaba `1fr 340px`. Se extendió el selector en
   `app/globals.css` (`@media (max-width: 768px)`) para cubrir también
   `1fr 360px`.

   ```css
   div[style*="gridTemplateColumns: 1fr 360px"],
   div[style*="grid-template-columns: 1fr 360px"] {
     grid-template-columns: 1fr !important;
   }
   ```

2. **Resumen del historial de votaciones no apilaba en móvil.**
   `components/VotacionesHistorial.tsx` define el grid inline
   `minmax(0, 1fr) minmax(260px, 340px)`, y la media query existente
   (`@media (max-width: 640px)`) usaba una regla normal. Los estilos
   inline **ganan** a las media queries, así que la columna de 340px
   quedaba fija. Se marcó la regla con `!important`:

   ```css
   @media (max-width: 640px) {
     .votaciones-historial__resumen { grid-template-columns: 1fr !important; }
   }
   ```

**Lección:** un grid ancho definido **inline** en un componente requiere
`!important` en la media query (o el style atómico gana). Antes de
apilar un layout de dos columnas, verificar si la columna fija viene de
un `style={{ gridTemplateColumns }}` inline.

## Reglas para el siguiente agente

1. Layouts de dos columnas con columna fija (`340px`, `360px`, etc.)
   deben apilarse en ≤768px; si se definen inline, usar `!important` en
   la media query.
2. Las tablas anchas van siempre dentro de un contenedor con
   `overflow-x: auto`/`.table-shell`. Nunca permitir que un `min-width`
   del contenedor fuerce el ancho de página.
3. Targets táctiles: `.btn` tiene `min-height: 44px` en ≤768px; no
   bajarlo para nuevas acciones móviles.
4. El menú móvil es el botón "Secciones" (`components/SiteHeader.tsx`,
   estado `menuOpen`): no reemplazarlo por un <select> u otro patrón sin
   documentar.

## Verificación tras tocar layout móvil

- `npm run typecheck`
- `npm run build` (sin errores)
- Comprobar en `localhost:3000` con DevTools (device toolbar) los
  viewports 360 / 430 / 600 / 768: sin scroll horizontal en el `body` y
  grids apilados en ficha de municipalidad, ficha de persona, comparador
  y resumen de votaciones.

## Estado al cierre de este pase

- typecheck OK, build OK (359 páginas; ver `build-out.txt`).
- Cambios solo en `app/globals.css` (2 reglas) y este documento.
- **Pendiente:** reiniciar `next start` para que el build sirva las
  reglas nuevas (el proceso previo escribía el `.next` con los cambios;
  el server en el puerto 3000 debe relanzarse).