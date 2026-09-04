# Resumen de datos de la landing

La portada no consulta D1 ni descarga datasets para mostrar sus cifras. Antes
de `next build`, `scripts/build-landing-summary.mjs` toma el snapshot local ya
hidratado por el ETL y genera:

- `data/generated/landing-summary.json`, usado durante el render estático;
- `public/data/landing-summary.json`, disponible como evidencia pública;
- la entrada `datasets.landing` dentro de `public/data/static-site-manifest.json`.

El resumen contiene conteos de fuentes, fecha de actualización, movimientos y
el checksum SHA-256 del archivo publicado. El HTML queda construido con esos
valores; el navegador no hace `fetch` para obtenerlos.

El flujo operativo es:

```text
ETL exitoso → snapshot R2 actualizado → Pages hidrata el snapshot
→ build-landing-summary → next build → verificación → deployment Pages
```

Si falla el ETL o la verificación, no se genera una publicación parcial y la
versión anterior de Pages permanece vigente. Los conteos que corresponden a
universos canónicos conservan además la métrica canónica independiente, para
no mezclar filas históricas con registros deduplicados.
