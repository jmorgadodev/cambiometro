# Incidente: personal de apoyo de Paz Charpentier — 11-10-2026

- Ficha afectada: `/politico/paz-charpentier-rajcevich/`; ID Cámara `1198`.
- Síntoma productivo: la ficha mostraba 0 personas y ausencia de contrataciones.
- Evidencia de origen: [personal de apoyo en Cámara](https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1198).
- Evidencia en R2: `projections/personal-apoyo-v1/personal-apoyo.json` tiene seis filas para `1198`, período **septiembre 2026**. El SHA-256 de los 1.420.180 bytes coincide con el manifiesto `adb13dc030e1fae3e8d7ea106db5417440e973ed8f139464e31529f55c5925ef`.
- Causa: `personalApoyoParaDiputado` leía primero D1 o un subset estático de sólo 20 diputados y trataba la ausencia en esa muestra como cero, aunque el release completo tuviera la ficha.
- Corrección: priorizar el release estático completo hidratado desde R2, memoizado por proceso; usar el fallback existente sólo si falta el archivo completo. No se modifica el ETL, R2 ni D1.
- Regresión: `lib/personal-apoyo-diputado.test.ts` reproduce subset sin ID `1198` y D1 antiguo; falló antes de corregir la lectura y pasó después. También pasaron 13 pruebas focalizadas, typecheck, arquitectura y enlaces.
- Límite: septiembre es el último período del release comprobado; no se afirma cobertura de octubre ni igualdad fila por fila con la selección actual del portal de Cámara.

## Cierre productivo

- [PR #781](https://github.com/jmorgadodev/cambiometro/pull/781), `main` `d774c1d2`: CI aprobó tipos, unitarias, seguridad, build de Pages y pruebas de navegador. [Evidencia del build](https://github.com/jmorgadodev/cambiometro/actions/runs/38150255614).
- [Publicación `ui-only`](https://github.com/jmorgadodev/cambiometro/actions/runs/38150809813) aprobada; deployment `08c0a1b9-6712-4826-8cc5-472bbd287b72`. La ficha pública responde 200, muestra **6/6 nombres** del release y “Septiembre 2026”; ya no muestra “Sin contrataciones publicadas”.
- Control cruzado: Jaime Coloma `9/9`, Cristian Contreras `8/8` y Boris Barrera `9/9` nombres del release visibles en sus fichas, todas HTTP 200. Home, Movimientos, Remuneraciones, Fuentes y `release-set.json` respondieron 200.
- Rollback de Pages al deployment anterior registrado: `npm run pages:rollback -- 22f9d418-8057-4c31-b2d9-2fe38e439b2f`.

No se ejecutó el ETL ni se escribieron objetos R2/D1. El error era de lectura del release, no ausencia de datos. No repetir la descarga de las 155 fichas por este incidente.
