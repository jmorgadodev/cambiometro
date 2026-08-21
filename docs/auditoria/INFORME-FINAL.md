# INFORME FINAL — Re-auditoría de integridad después de FIX-1 a FIX-5

## Veredicto

**¿Los datos corregidos cumplen el gate de integridad? CON FIXES.**

La re-auditoría registró **0 CRITICA**, **418 ALTA** y una cobertura comparable de **51.33%**. Gate de merge: **ABIERTO respecto de CRITICAS; no se ejecutó merge**. No se hizo merge ni deploy.

## Alcance y metodología

- Corte 2026-08-20; año 2026; linaje 70/70 campos.
- Parlamentarios: 205/205 — 50 senadores y 155 diputados.
- Agregados: 40; partidos, coaliciones, regiones, cámaras y nacional.
- Entidades: 538 organismos y 346 municipalidades.
- Muestra: 631 filas por SHA-256 y ceil(n × 10%); 506 organismos sin filas asociables reducen cobertura.
- SINIM: 345/346; faltante declarado y no interpolado.
- Sitio corregido local: RSC Flight text/x-component; HTML solo para la muestra de cinco fichas; API por ítem únicamente ante falla RSC.
- Autoridad: fuente oficial actual → proyección regenerada → lake local regenerado → sitio local corregido.

## Resultado global

| OK | MENOR | ALTA | CRITICA | FUENTE_NO_DISPONIBLE | CAPA_NO_DISPONIBLE |
|---:|---:|---:|---:|---:|---:|
| 3309 | 6 | 418 | 0 | 3540 | 0 |

Exactitud: **3309/3733 = 88.64%**. Cobertura comparable: **3733/7273 = 51.33%**. Las fuentes no disponibles se excluyen de exactitud, pero reducen cobertura.

## Exactitud por categoría

| Categoría | Exactitud | Cobertura comparable | MENOR | ALTA | CRITICA |
|---|---:|---:|---:|---:|---:|
| asistencia | 205/205 (100%) | 205/205 (100%) | 0 | 0 | 0 |
| camara | 14/14 (100%) | 14/14 (100%) | 0 | 0 | 0 |
| coalicion | 21/21 (100%) | 21/21 (100%) | 0 | 0 | 0 |
| compras | 0/4 (0%) | 4/1772 (0.23%) | 0 | 4 | 0 |
| dotacion | 18/54 (33.33%) | 54/592 (9.12%) | 0 | 36 | 0 |
| gastos_operacionales | 100/100 (100%) | 100/269 (37.17%) | 0 | 0 | 0 |
| identidad | 404/410 (98.54%) | 410/410 (100%) | 6 | 0 | 0 |
| nacional | 7/7 (100%) | 7/7 (100%) | 0 | 0 | 0 |
| partido | 144/144 (100%) | 144/144 (100%) | 0 | 0 | 0 |
| personal | 0/0 (0%) | 0/538 (0%) | 0 | 0 | 0 |
| personal_apoyo | 63/314 (20.06%) | 314/314 (100%) | 0 | 251 | 0 |
| presupuesto | 504/631 (79.87%) | 631/1137 (55.5%) | 0 | 127 | 0 |
| region | 112/112 (100%) | 112/112 (100%) | 0 | 0 | 0 |
| sinim | 1360/1360 (100%) | 1360/1381 (98.48%) | 0 | 0 | 0 |
| votaciones | 357/357 (100%) | 357/357 (100%) | 0 | 0 | 0 |

## Controles Kaiser

- Mayo: $4.582.550 oficial vs $4.582.550 proyección corregida — OK/V1.
- Julio: $11.406.149 de asignación vs $15.250.000 en sueldos — ALTA/V2; anomalía oficial preservada con aviso visible.
- La calibración posterior a FIX-1 exige que la cifra duplicada $9.165.100 sea rechazada por regresión, no aceptada como salida.

## Estado de las correcciones

1. FIX-1: filas resumen excluidas de agregaciones; V1 permanente.
2. FIX-2: base, política y traspasos acreditados de personal expuestos; excesos se rotulan.
3. FIX-3 / R10: sin montos, órdenes ni proveedores sintéticos; ausencia = null; unión solo por RUT verificado.
4. FIX-4: subtítulos DIPRES del último snapshot, sin suma intermensual acumulada.
5. FIX-5: registros V7 de dotación en cuarentena, fuera de totales y rankings, con evidencia visible.

## Causas residuales

Familias con CRITICA: **ninguna**. El archivo 04-causas-raiz.md enlaza el 100% de ALTAS/CRITICAS y sus guards exactos.

## Guards permanentes V1–V7 y R10

- V1: total oficial = conceptos sin filas resumen; diferencia no mitigada es CRITICA.
- V2: exceso hasta 40% ALTA y sobre 40% CRITICA; una anomalía oficial fielmente proyectada solo se mitiga en el informe si el sitio la advierte y conserva el estado V2 crudo.
- V3: total = sí + no + abstención + presente sin votar; diferencia CRITICA.
- V4: numerador ≤ denominador ≤ sesiones y error ≤0,5 puntos.
- V5: tolerancia cero en agregados.
- V6: RUT/partido discordante ALTA; diferencia superficial MENOR.
- V7: sueldo >$60M, horas >300, relación >total anual o gasto >140%; anomalías oficiales se aíslan y rotulan.
- R10: ningún fallback sintético; un faltante de evidencia permanece null/FUENTE_NO_DISPONIBLE.
- CI ejecuta `npm run guard:integrity` y retorna código distinto de cero ante cualquier CRITICA o validador ausente.

## Pruebas y cierre técnico

- Pruebas Node de auditoría, tests de regresión de aplicación, typecheck y build ejecutados sin deploy.
- Los ETLs se ejecutaron localmente desde fuentes oficiales y las proyecciones se regeneraron antes de esta re-auditoría.
- No se copiaron respuestas crudas ni datos del lake al historial Git; solo artefactos públicos trackeados.
- No se hizo merge a main.

## Artefactos

00-linaje.md; 01-parlamentarios.json; 01-resumen.md; 02-agregados.json; 02-resumen.md; 03-entidades.json; 03-resumen.md; 04-causas-raiz.md; INFORME-FINAL.md.
