# Fase 5 local: Movimientos, Datos y Metodología

Rama: codex/movimientos-datos-local-20261118. Base local d0790b5d68ef28d32e51007ee1399d87d4651e42; origin/main 915fe31ecba9a8ceb23a146352ef8bc723f56c7b. Hereda los incrementos locales de Personal, Dietas y Votaciones.

Alcance: impedir verificación automática por URL y pérdida de identidades publicadas; validar las fechas usadas como última publicación. Datos y Metodología explicarán automatización, corte y cobertura por separado, leyendo el calendario canónico sin modificarlo.

Archivos: scripts/movimientos-{pipeline,publication}.mjs, lib/movimientos.ts, lib/source-automation.ts, lib/data-quality-dashboard.ts, páginas Datos/Calidad/Fuentes/Metodología y pruebas afectadas. Sin navegación global, estilos globales, snapshots ni contratos R2 modificados.

Aceptación: URL sola no confirma; igual conteo no permite perder un ID; fechas imposibles no aparentan actualización; fuentes pausadas conservan cobertura y datos; cron o tarea local no acredita ejecución sana. Pruebas del módulo, lint, tipos y revisión de las páginas en escritorio/móvil. Publicación agrupada pendiente, sin ETL ni CI remotos.

Recuperación: revertir este incremento local; conservar el último release válido. Correcciones que retiren identidades requieren reconciliación documental explícita, nunca una extracción automática.


Consumidores adicionales coordinados en este mismo incremento: components/datos/EtlHealthDashboardClient.tsx y lib/etl-sources-data.ts (sourceId público estable para asociar estado). No se modifica el esquema R2 ni se publica el calendario interno al cliente.
