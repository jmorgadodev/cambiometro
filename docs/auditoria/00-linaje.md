# Fase A — Linaje de campos numéricos publicados

**Corte:** 2026-08-20  
**Inventario:** 70 campos numéricos canónicos  
**Cobertura de linaje:** 70/70 (100%)

## Método y jerarquía

La fuente oficial actual es la autoridad. Las proyecciones trackeadas y el
lake archivado son capas diagnósticas; el sitio es la última capa publicada.
En producción, las fichas dinámicas se leen desde el payload Flight/RSC
`text/x-component`. El identificador de despliegue M2
`22ce1ca3-d8eb-4b61-a811-9f22e2b86f74` no es un Next build-id consumible:
`/_next/data/<id>/...` y `/_next/static/<id>/_buildManifest.js` responden 404.

D1 no asigna una columna física a cada métrica. El modelo canónico guarda el
monto comparable en `records.amount_json` y el resto de campos originales o
normalizados en `records.data_json`; la pertenencia se resuelve mediante
`record_subjects`. La definición está en
`migrations/0010_canonical_data_platform.sql:24-56` y la conversión en
`scripts/etl/materialize.mjs:20-62`.

## Inventario de campos

### Parlamentarios — 31

- Gastos (6): `gasto_item_monto_clp`, `gasto_total_oficial_clp`,
  `gasto_suma_items_clp`, `gasto_total_mes_clp`,
  `gasto_total_acumulado_clp`, `gasto_variacion_pct`.
- Personal (5): `personal_sueldo_clp`, `personal_total_mensual_clp`,
  `personal_total_2026_clp`, `personal_personas_count`,
  `asignacion_base_clp`.
- Asistencia (6): `sesiones_total`, `sesiones_presentes`, `inasistencias`,
  `asistencia_pct`, `votos_emitidos`, `votos_emitidos_pct`.
- Votaciones (6): `votacion_total`, `votacion_favor`, `votacion_contra`,
  `votacion_abstencion`, `votacion_presente_no_vota`,
  `votacion_total_asistencia`.
- Dieta (3): `dieta_bruta_clp`, `dieta_deducciones_clp`, `dieta_neta_clp`.
- Patrimonio (2): `declaraciones_count`, `pasivos_declarados_clp`.
- Electoral (3): `votos_2025`, `porcentaje_votos`, `numero_distrito`.

### Servicios públicos — 14

`presupuesto_inicial_clp`, `presupuesto_vigente_clp`,
`presupuesto_ejecutado_clp`, `presupuesto_ejecucion_pct`,
`presupuesto_mensual_vigente_clp`, `presupuesto_mensual_ejecutado_clp`,
`subtitulo_vigente_clp`, `subtitulo_ejecutado_clp`, `dotacion_total`,
`masa_salarial_mensual_clp`, `sueldo_promedio_clp`, `horas_extras_max`,
`compras_monto_total_clp`, `compras_procesos_count`.

### Municipalidades — 16

`presupuesto_inicial_clp`, `presupuesto_vigente_clp`,
`presupuesto_per_capita_clp`, `ingresos_totales_clp`, `fcm_ingresos_clp`,
`fcm_dependencia_pct`, `personal_total`, `personal_planta`,
`personal_contrata`, `personal_honorarios`, `remuneracion_bruta_clp`,
`horas_extras_monto_clp`, `horas_extras_hrs`, `compras_monto_total_clp`,
`compras_procesos_count`, `compras_orden_monto_clp`.

### Agregados y rankings — 9

`partido_escanos_total`, `partido_votos_emitidos`, `partido_pct_si`,
`partido_pct_no`, `partido_asistencia_pct`, `partido_gastos_total_clp`,
`partido_personal_total_clp`, `ranking_candidato_votos`,
`ranking_pacto_votos`.

## Matriz de linaje

| Campos | Fuente oficial actual | ETL / normalización | Proyección o lake | D1 | Loader | Publicación |
|---|---|---|---|---|---|---|
| Gastos Senado (6) | `web-back.senado.cl/api/transparency/senator-assignments/operational-expenses`; portal Senado | `scripts/etl/connectors/senado.mjs:20-77,201-233` | `partitions/gastos_senado/<año>/<mes>` | `records.amount_json`, `data_json`; `source_id=gastos_senado` | `lib/politico-canonical.ts` y `lib/gastos-operacionales.ts:76-160` | `app/politico/[id]/page.tsx:468-506`; `gastos-mensuales.tsx:123-222` vía RSC |
| Gastos Cámara (6) | `camara.cl/diputados/detalle/gastosoperacionales.aspx` | `scripts/etl/connectors/camara-gastos.mjs:77-89,104-144,165-262` | `partitions/gastos_camara/<año>/<mes>` | `records.amount_json`, `data_json`; `source_id=gastos_camara` | `lib/politico-canonical.ts`; `lib/gastos-operacionales.ts:95-155` | `app/politico/[id]/page.tsx:468-506`; `gastos-mensuales.tsx:123-222` vía RSC |
| Personal Cámara (5) | `camara.cl/diputados/detalle/personaldepoyo.aspx` | `scripts/etl-personal-apoyo.mjs:68-132,158-206` | `data/personal-apoyo.json` / publicación KV | No se materializa en `records`; fallback JSON/KV documentado | `lib/personal-apoyo.ts` | `components/PersonalApoyoMensual.tsx:78-120,173-276` vía RSC |
| Personal Senado (5) | `web-back.senado.cl/api/transparency/senator-assignments/support-staff` | `scripts/etl-personal-apoyo.mjs:229-270` | `data/personal-apoyo.json` / publicación KV | No se materializa en `records`; fallback JSON/KV documentado | `lib/personal-apoyo.ts` | `components/PersonalApoyoMensual.tsx:78-120,173-276` vía RSC |
| Asistencia Cámara (6) | WSSala `retornarSesionesXAnno` y `retornarSesionAsistencia` | `scripts/etl/connectors/camara-attendance.mjs:26-37,178-291` | `partitions/camara/<año>/<mes>` | `records.data_json`; `source_id=camara` | `lib/politico-canonical.ts` / `lib/data-source.ts` | `app/politico/[id]/page.tsx:241-260,340-344`; `PoliticoScoreHeader.tsx:318-354` |
| Votaciones y asistencia Senado (12 compartidos) | `tramitacion.senado.cl/wspublico/sesiones.php`; APIs `votes` y `sessions/attendance` | `scripts/etl/connectors/senado-votaciones.mjs:50-86,112-183` | `partitions/votaciones_senado/<año>/<mes>` | `records.data_json`; `source_id=votaciones_senado` | `lib/politico-canonical.ts` | `components/VotacionesHistorial.tsx:104-135,220-265,334-466` |
| Dieta Senado (3) | `web-back.senado.cl/api/transparency/diet` | `scripts/etl/connectors/senado.mjs:95-108,172-198` | `partitions/senado/<año>/<mes>` | `records.amount_json`, `data_json`; `kind=remuneration` | `lib/remuneraciones.ts` | `app/politico/[id]/page.tsx:405-425` |
| Dieta Cámara (3) | Transparencia Cámara / remuneración parlamentaria | normalización de remuneraciones publicada por ETL parlamentario | snapshot/KV parlamentario | `records.amount_json` cuando existe; fallback KV | `lib/remuneraciones.ts` | `app/politico/[id]/page.tsx:405-425` |
| Patrimonio (2) | `infoprobidad.cl` / declaraciones oficiales | `scripts/etl/connectors/infoprobidad.mjs`; reconciliación de personas al materializar | `projections/v1/infoprobidad.json` y particiones | `records.data_json`; `source_id=infoprobidad` | `lib/infoprobidad.ts:87-106` | `app/politico/[id]/page.tsx:754-759` |
| Resultados electorales (3) | SERVEL 2025 | `scripts/etl/ingest-servel-gastos.mjs` y proyección SERVEL | `projections/v1/servel.json` | `records.data_json`; `source_id=servel` | `lib/servel.ts` / seed político reconciliado | `app/politico/[id]/page.tsx:384-391,663-664` |
| Presupuesto servicios (8) | DIPRES ejecución presupuestaria 2026 | `scripts/etl/connectors/dipres.mjs:147-216,261-289` | `projections/v1/presupuesto.json` | `records.amount_json`, `data_json`; `source_id=dipres` | `lib/servicios-publicos-data.ts` | `components/servicios/ServicioPublicoDashboardClient.tsx:83-86,243-429` |
| Dotación y remuneraciones servicios (4) | CPLT / Transparencia Activa | `scripts/etl/stream-remote-personal.mjs` y proyección de organismos | `projections/v1/organismos.json` | registros de remuneración en `records.data_json` cuando materializados; fallback de proyección | `lib/servicios-publicos-data.ts`, `lib/funcionarios-fallback.ts` | `ServicioPublicoDashboardClient.tsx:106,495-540` |
| Compras servicios (2) | API OCDS MercadoPúblico | `scripts/etl/connectors/chilecompra.mjs:37-42,199-300,365-462` | `projections/v1/chilecompra.json` | `records.amount_json`, `data_json`; `source_id=chilecompra` | `lib/servicios-publicos-data.ts` | `ServicioPublicoDashboardClient.tsx:129-132` |
| Presupuesto e ingresos municipales (6) | SINIM/SUBDERE | `scripts/etl/connectors/sinim.mjs:4-16,82-127` | `projections/v1/sinim.json`; `data/municipalidades-data.json` | `records.amount_json`, `data_json`; `source_id=sinim` | `lib/municipalidades-data.ts:175-182` | `MunicipalidadDetailDashboardClient.tsx:130-136,483-691` |
| Personal municipal (7) | CPLT / Transparencia Activa | `scripts/etl/ingest-municipal-personal.mjs` y proyección por municipio | `projections/funcionarios-v1/muni-*.json` | fallback de proyección; registros canónicos si están materializados | `lib/municipalidades-data.ts`, `lib/funcionarios-fallback.ts` | `MunicipalidadDetailDashboardClient.tsx:918-1069` |
| Compras municipales (3) | API OCDS MercadoPúblico | `scripts/etl/connectors/chilecompra.mjs:199-300,365-462` | `projections/v1/chilecompra.json`; `data/municipalidades-data.json` | `records.amount_json`, `data_json`; `source_id=chilecompra` | `lib/municipalidades-data.ts` | `MunicipalidadDetailDashboardClient.tsx:1122-1510` |
| Agregados de partido (7) | Componentes parlamentarios oficiales anteriores | `lib/partido-estadisticas.ts:88-108` y agregadores del ETL | `data/partidos-stats.json` / KV | Derivados de `records` agrupados por identidad/partido | `lib/partido-estadisticas.ts` | `app/partidos/[sigla]/page.tsx:81-108,178-229` |
| Rankings electorales (2) | SERVEL 2025 | ingesta y proyección SERVEL | `projections/v1/servel.json` | `records.data_json`; `source_id=servel` | `lib/servel.ts` | `app/rankings/page.tsx:20-81` |

## Riesgos de linaje que pasan a las fases B–D

1. Personal de apoyo se publica desde JSON/KV y no atraviesa las tablas
   canónicas de D1; una divergencia puede nacer antes de D1 y permanecer
   invisible para los controles de materialización.
2. `procesarGastosPolitico` usa la suma de ítems como total visible cuando hay
   desglose (`lib/gastos-operacionales.ts:114-128`), aunque conserva el total
   oficial en `totalPublicadoFuente`. Esto explica cómo una inconsistencia V1
   puede publicarse como cifra recalculada.
3. Los agregados de partido combinan KV con `partidos-stats.json`; la auditoría
   debe recalcularlos desde las 205 fichas, no confiar en el agregado cacheado.
4. La proyección SINIM declara 345 municipios mientras la interfaz publica un
   catálogo de 346; la ausencia se tratará como cobertura, nunca como cero.
