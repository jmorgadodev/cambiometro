# Cobertura de Datos y Módulos

Detalle técnico de los módulos de datos de la plataforma y de la política que los rige. El flujo de datos, los pipelines y las reglas de integridad están documentados en [arquitectura-datos.md](./arquitectura-datos.md).

## Política de datos

Solo se publican datos reales y verificados. Un dato sin fuente se omite o se marca como tal; una relación documental nunca se presenta como una irregularidad. No se inventan cifras, personas ni alertas.

## Municipalidades y Censo 2024

- Cobertura completa de las 52 comunas de la Región Metropolitana y del resto del país según el catálogo oficial.
- Cada municipalidad expone indicadores oficiales: `poblacion_censo_2024`, `viviendas_censo_2024`, `variacion_intercensal_pct`, `idh_comunal`, `pobreza_casen_pct`, `presupuesto_municipal_clp` y presupuesto per cápita (`presupuesto_municipal_clp / poblacion_censo_2024`).

## Nómina de funcionarios públicos

- La nómina municipal proviene de Transparencia Activa (portaltransparencia.cl) y se conserva con su URL y período de origen.
- No se publican RUT ni se infieren alertas de parentesco por nombres o apellidos.
- La lista clasifica por departamento y tipo de contrato, con paginación y exportador CSV.

## Ficha de políticos

- Los 205 parlamentarios (diputados y senadores) cuentan con foto real (`foto_url`), datos del período vigente y su escaño actual.
- Las secciones sin fuente verificada (gastos, votaciones, timeline, causas) muestran un aviso explícito en vez de contenido inventado.
- Los rankings del home usan datos verificados (por ejemplo, votación 2025) y nunca montos sin fuente.

## Calculadora "Mi Impuesto"

- Tramos de retención del Impuesto Único de 2.ª Categoría según el baremo SII vigente (`Retención = Tasa × Renta Imponible − Rebaja`).
- Incluye la dieta parlamentaria bruta vigente, el desglose de destino fiscal y la equivalencia en días de dieta.

## Movimientos de autoridades

- Registro de cambios de autoridades: renuncias, remociones, designaciones, confirmaciones, reasunciones y creación de carteras.
- Alcance por tipo de cargo: nacional (presidente, ministros, subsecretarios, jefes de servicio, superintendentes, empresas públicas), regional (gobernadores, seremis de las 16 regiones), local (alcaldes) e internacional (embajadores y cónsules).
- Criterio de verificación: los datos cotejados contra fuentes oficiales se marcan `verificado: true` y citan su fuente; los no cotejados llevan el badge "sin fuente verificada" y pueden ocultarse con el filtro "Solo verificados".

## Estructura de archivos

| Archivo | Rol |
|---------|-----|
| `lib/seed-politicos.ts` | Barrel que re-exporta los dominios activos (partidos, políticos, scores, municipalidades, servicios públicos, funcionarios) |
| `lib/politicos-source.ts` | Dataset vigente de 205 políticos desde fuentes verificadas |
| `lib/funcionarios-source.ts` | Nómina municipal real (Transparencia Activa) |
| `lib/municipalidades.ts` | Catálogo de comunas con Censo 2024 |
| `lib/servicios-publicos.ts` | Servicios públicos con directores verificados y fuente |
| `lib/movimientos.ts` | Esquema de movimientos de autoridades |
| `lib/seremis.ts` | Seremis regionales 2026-2030 (16/16 regiones con nombre confirmado y fuente) |
| `lib/gabinete-kast.ts` | Gabinete 2026 con fuente por cargo |
| `lib/subsecretarios.ts` | Subsecretarios con titular y fuente |
| `lib/consules.ts` | Cónsules generales con titular y fuente |
| `lib/gobernadores-regionales.ts` | Gobernadores 2024-2028 con fuente SERVEL |