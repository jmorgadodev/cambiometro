# Fase B — Auditoría de parlamentarios

- Corte: 2026-08-20
- Universo oficial: **50 senadores + 155 diputados = 205**
- Comparaciones registradas: **1555**
- Estados: OK 1028, MENOR 6, ALTA 206, CRITICA 145, FUENTE_NO_DISPONIBLE 169, CAPA_NO_DISPONIBLE 1
- RSC/HTML: **APROBADA** en cinco fichas; extracción masiva únicamente por RSC con fallback API por ítem.
- Control Kaiser mayo: oficial $4.582.550, suma visible $9.165.100, CRITICA/V1.
- Control Kaiser julio: asignación $11.406.149, sueldos $15.250.000, ALTA/V2.
- Tiempo: 480 s.

El primer defecto sistémico de V1 aparece en `scripts/etl/generate-partidos-stats.ts:259-270`, que agrega `VALOR TOTAL` junto con los conceptos. La ficha individual sí aplica el filtro correcto en `lib/gastos-operacionales.ts:102-118`; la fuente oficial también cuadra al excluir la fila resumen.
