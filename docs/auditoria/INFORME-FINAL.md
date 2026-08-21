# INFORME FINAL — Auditoría completa de integridad de datos

## Veredicto

**¿Los datos publicados son íntegros y aptos para considerarse correctos sin reservas? NO.**

Hay 779 comparaciones CRITICA, 458 ALTA y cobertura comparable de 71.8%. Una sola CRITICA basta para un veredicto NO. No se hizo merge, deploy ni modificación de aplicación, ETL o datos.

## Alcance y metodología

- Corte 2026-08-20; año 2026; linaje 70/70 campos.
- Parlamentarios: 205/205 — 50 senadores y 155 diputados.
- Agregados: 40; partidos, coaliciones, regiones, cámaras y nacional.
- Entidades: 538 organismos y 346 municipalidades.
- Muestra: 631 filas por SHA-256 y ceil(n × 10%); 506 organismos sin filas asociables reducen cobertura.
- SINIM: 345/346; falta Antártica (CUT 12202), sin completar ni interpolar.
- Sitio: RSC Flight text/x-component; HTML solo en cinco fichas; API solo como fallback por ítem.
- 22ce1ca3-d8eb-4b61-a811-9f22e2b86f74 es el deploy M2 esperado, no un Next build-id consumible; /_next/data y manifests no existen en App Router.
- Autoridad: fuente oficial actual → proyección trackeada → lake archivado de solo lectura → sitio.

## Resultado global

| OK | MENOR | ALTA | CRITICA | FUENTE_NO_DISPONIBLE | CAPA_NO_DISPONIBLE |
|---:|---:|---:|---:|---:|---:|
| 6010 | 6 | 458 | 779 | 2848 | 1 |

Exactitud: **6010/7253 = 82.86%**. Cobertura comparable: **7253/10102 = 71.8%**. Las fuentes no disponibles se excluyen de exactitud, pero reducen cobertura.

## Exactitud por categoría

| Categoría | Exactitud | Cobertura comparable | MENOR | ALTA | CRITICA |
|---|---:|---:|---:|---:|---:|
| asistencia | 205/205 (100%) | 205/205 (100%) | 0 | 0 | 0 |
| camara | 14/14 (100%) | 14/14 (100%) | 0 | 0 | 0 |
| coalicion | 21/21 (100%) | 21/21 (100%) | 0 | 0 | 0 |
| compras | 58/692 (8.38%) | 692/1768 (39.14%) | 0 | 0 | 634 |
| dotacion | 2787/2887 (96.54%) | 2887/3425 (84.29%) | 0 | 100 | 0 |
| gastos_operacionales | 0/100 (0%) | 100/269 (37.17%) | 0 | 0 | 100 |
| identidad | 403/409 (98.53%) | 409/410 (99.76%) | 6 | 0 | 0 |
| nacional | 7/7 (100%) | 7/7 (100%) | 0 | 0 | 0 |
| partido | 144/144 (100%) | 144/144 (100%) | 0 | 0 | 0 |
| personal | 0/0 (0%) | 0/538 (0%) | 0 | 0 | 0 |
| personal_apoyo | 63/314 (20.06%) | 314/314 (100%) | 0 | 206 | 45 |
| presupuesto | 479/631 (75.91%) | 631/1137 (55.5%) | 0 | 152 | 0 |
| region | 112/112 (100%) | 112/112 (100%) | 0 | 0 | 0 |
| sinim | 1360/1360 (100%) | 1360/1381 (98.48%) | 0 | 0 | 0 |
| votaciones | 357/357 (100%) | 357/357 (100%) | 0 | 0 | 0 |

## Controles Kaiser

- Mayo: $4.582.550 oficial vs $9.165.100 agregado — CRITICA/V1.
- Julio: $11.406.149 de asignación vs $15.250.000 en sueldos — ALTA/V2.
- Calibración APROBADA con API y página oficial; las cifras esperadas solo fueron aserciones.
- Alcance sistémico: RC-01 afecta todo agregado que incluya filas resumen; RC-02 afecta todo exceso sin traspaso publicado.

## Causas y fixes

Familias críticas: **RC-01, RC-02, RC-03**. 04-causas-raiz.md contiene líneas exactas, fixes, regresiones y el 100% de identificadores.

1. RC-01: doble suma de resúmenes de gasto.
2. RC-03: matching textual y fallbacks sintéticos en compras.
3. RC-04: suma intermensual de ejecución acumulada DIPRES.
4. RC-05: anomalías de dotación no aisladas.

## Guards V1–V7

- V1: total oficial = conceptos sin resúmenes; diferencia CRITICA.
- V2: exceso sobre base hasta 40% ALTA; sobre 40% CRITICA, salvo traspaso trazado.
- V3: total = sí + no + abstención + presente sin votar; diferencia CRITICA.
- V4: numerador ≤ denominador ≤ sesiones y error ≤0,5 puntos; incumplimiento ALTA.
- V5: tolerancia cero.
- V6: RUT/partido discordante ALTA; diferencia superficial MENOR.
- V7: sueldo >$60M, horas >300, relación >total anual o gasto >140% ALTA.

## Acciones previas a un merge

- Aplicar RC-01, RC-03 y RC-04 y regenerar desde fuentes oficiales.
- Publicar base y traspasos de personal para resolver RC-02.
- Eliminar montos, órdenes y proveedores sintéticos; ausencia debe ser null.
- Completar fuente fila-a-fila en 506 organismos; no reducir el 10%.
- Reejecutar A–E y exigir cero CRITICA/ALTA para un SI.

## Pruebas y cierre técnico

- Auditoría: 22/22 pruebas Node aprobadas; sintaxis de todos los scripts aprobada.
- Aplicación: 92 archivos de prueba y 490/490 tests aprobados.
- Build Next.js: aprobado; TypeScript, compilación y generación de 431 páginas completados sin deploy.
- Los comandos parlamentarios/entidades retornan código 2 de forma intencional al encontrar CRITICAS, después de escribir resultados.

## Artefactos

00-linaje.md; 01-parlamentarios.json; 01-resumen.md; 02-agregados.json; 02-resumen.md; 03-entidades.json; 03-resumen.md; 04-causas-raiz.md; INFORME-FINAL.md.
