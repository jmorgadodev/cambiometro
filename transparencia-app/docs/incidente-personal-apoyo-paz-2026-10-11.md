# Incidente: personal de apoyo de Paz Charpentier — 11-10-2026

- Ficha afectada: `/politico/paz-charpentier-rajcevich/`; ID Cámara `1198`.
- Síntoma productivo: la ficha mostraba 0 personas y ausencia de contrataciones.
- Evidencia de origen: [personal de apoyo en Cámara](https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1198).
- Evidencia en R2: `projections/personal-apoyo-v1/personal-apoyo.json` tiene seis filas para `1198`, período **septiembre 2026**. El SHA-256 de los 1.420.180 bytes coincide con el manifiesto `adb13dc030e1fae3e8d7ea106db5417440e973ed8f139464e31529f55c5925ef`.
- Causa: `personalApoyoParaDiputado` leía primero D1 o un subset estático de sólo 20 diputados y trataba la ausencia en esa muestra como cero, aunque el release completo tuviera la ficha.
- Corrección: priorizar el release estático completo hidratado desde R2, memoizado por proceso; usar el fallback existente sólo si falta el archivo completo. No se modifica el ETL, R2 ni D1.
- Regresión: `lib/personal-apoyo-diputado.test.ts` reproduce subset sin ID `1198` y D1 antiguo; falló antes de corregir la lectura y pasó después. También pasaron 13 pruebas focalizadas, typecheck, arquitectura y enlaces.
- Límite: septiembre es el último período del release comprobado; no se afirma cobertura de octubre ni igualdad fila por fila con la selección actual del portal de Cámara.

El cierre productivo requiere CI, despliegue `ui-only` y comprobar en la ficha que aparezcan el período y las seis filas. No repetir la descarga de las 155 fichas para corregir este problema de lectura.
