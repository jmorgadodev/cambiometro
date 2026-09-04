# Auditoría de cierre — 2026-09-04

## Alcance

Auditoría realizada exclusivamente en `cambiometro-public`. No se consultó
D1 de producción, no se ejecutó ETL remoto, no se hizo deploy, no se cambió
DNS/WAF y no se modificó el plan de Cloudflare.

## Verde local

- Suite: 158 archivos, 855 tests.
- Typecheck de sitio y Worker: verde.
- Lint: 0 errores; quedan 149 warnings preexistentes.
- Arquitectura estática, tokens, links seguros e inyección HTML: verde.
- Calendario ETL: 13 workflows verificados con `America/Santiago`.
- Guards de artefactos generados y entradas estáticas: verdes.
- Guard de Pages/Worker/DNS/WAF: verde.
- Worker: 162,15 KiB sin comprimir / 29,29 KiB gzip, bajo 1 MB.
- Export existente: 17.218 archivos, 5.018 HTML, 0 assets sobre 25 MiB.
- Fichas: 205 políticos y 346 municipalidades verificadas.
- SEO estático: 5.013 rutas canónicas y 5.013 URLs en sitemap.
- Gastos: 22.788 registros en las dos slices publicadas.

## Cambios preparados

- `db22ef3`: candado local post-reinicio D1 y runbook operativo.
- `c5ef9c2`: omisión por checksum de la materialización de transferencias.
- `5f5900a`: exclusión de temporales y artefactos locales del seguimiento Git.

La automatización `vigilar-d1-cada-noche` está activa y revisa después del
reinicio UTC. Notifica cuando el consumo está bajo 60% y `/api/v1/health`
permite comenzar la prueba incremental.

## Pendientes que bloquean declarar cierre

1. El CI de `5f5900a` sigue en ejecución:
   [Quality run 33854774157](https://github.com/jmorgadodev/cambiometro/actions/runs/33854774157).
   CodeQL del mismo commit terminó verde.
2. La rama está 4 commits delante y 1 detrás de `origin/main`; no hay PR
   abierto para los commits posteriores al PR #350. Falta integrar mediante
   revisión explícita.
3. Falta la prueba remota posterior al reinicio: Analytics de uso, health
   único, ETL incremental, segunda ejecución sin cambios y medición de
   `rows_read`.
4. Las votaciones diarias aún necesitan materialización por particiones para
   garantizar que una actualización no recorra todo el histórico de D1.
5. Falta repetir en producción el navegador, CSP, crawl frío, doble
   `verify-prod-full` y uptime-smoke. Ninguno se declara verde por pruebas
   locales.
6. El release actual de transferencias es internamente coherente y pasó sus
   guards, pero reporta 59.544 filas y `$5.013.581.357.467`; el baseline
   histórico documentado era 59.361 filas. Debe confirmarse si el criterio de
   lanzamiento acepta el release fresco o exige reconciliar el baseline.

## Observaciones no bloqueantes

- Wrangler advierte que `send_email` está definido en producción pero no en el
  entorno `preview`; conviene heredarlo explícitamente si se necesita probar el
  formulario en preview.
- El artefacto Pages ocupa mucho espacio total, pero actualmente respeta los
  límites comprobados de cantidad de archivos y tamaño individual.
