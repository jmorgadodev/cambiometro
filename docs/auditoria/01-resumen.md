# Fase B — Auditoría de parlamentarios

- Corte: 2026-08-20
- Universo oficial: **50 senadores + 155 diputados = 205**
- Comparaciones registradas: **1555**
- Estados: OK 1129, MENOR 6, ALTA 251, CRITICA 0, FUENTE_NO_DISPONIBLE 169, CAPA_NO_DISPONIBLE 0
- RSC/HTML: **APROBADA** en cinco fichas; extracción masiva únicamente por RSC con fallback API por ítem.
- Control Kaiser mayo: oficial $4.582.550, suma visible $4.582.550, OK/V1.
- Control Kaiser julio: asignación $11.406.149, sueldos $15.250.000, ALTA/V2.
- Tiempo: 177 s.

FIX-1 está activo: la fila `VALOR TOTAL` se conserva como control y se excluye de la agregación mediante el helper compartido en `lib/gastos-operacionales.ts`.
