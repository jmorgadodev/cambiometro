# Auditoría de buscador y costos parlamentarios — 26-09-2026

## Ruta de trabajo autorizada

- Repositorio maestro: `C:\Users\jorge\Proyectos\cambiometro-public`
- Aplicación oficial: `C:\Users\jorge\Proyectos\cambiometro-public\transparencia-app`
- Los cambios se preparan desde `origin/main` en un worktree aislado.
- `cambiometro-design-sandbox` es sólo una referencia visual y `cambiometro-audit` no es la aplicación de producción.

## Resultado de la auditoría temporal

La interfaz no está limitada a 2026. Los filtros de año y mes se construyen únicamente con períodos presentes en la evidencia publicada para cada ficha. No se completan meses ni años por inferencia.

Comprobaciones directas contra la API productiva R2 para `gastos_senado`:

| Período comprobado | Registros | Estado |
| --- | ---: | --- |
| 2012-01 | 307 | completo |
| 2013-01 | 324 | completo |
| 2014-03 | 260 | completo |
| 2015-01 | 381 | completo |
| 2016-01 | 374 | completo |
| 2017-01 | 377 | completo |
| 2018-01 | 380 | completo |
| 2019-01 | 817 | completo |
| 2020-01 | 817 | completo |
| 2021-01 | 817 | completo |
| 2022-01 | 817 | completo |
| 2023-01 | 1.150 | completo |
| 2024-01 | 1.200 | completo |
| 2025-01 | 1.200 | completo |
| 2026-07 | 1.250 | completo |

El histórico productivo de Senado contiene años 2012–2026. El release consultado de Cámara corresponde a 2026. Remuneración 38 bis y personal de apoyo conservan sus propios cortes; no se presenta una fecha global como si todas las fuentes tuvieran la misma cobertura.

## Reglas de integridad aplicadas

- El período inicial es el último período realmente publicado para la ficha.
- Sueldo, gastos y personal de apoyo sólo se suman cuando existe evidencia para el período seleccionado.
- Cero publicado se distingue de dato ausente o no informado.
- Un período sin año explícito no se asigna automáticamente a 2026.
- Registros de fuentes distintas no se fusionan sólo por coincidir en el nombre.
- Las fichas con identificador oficial pueden reunir evidencia bajo ese identificador.

## Buscador

- La Home conserva coincidencias rápidas, pero `Ver todos los resultados` siempre abre `/buscar?q=…`.
- `/buscar` agrupa antes de paginar y muestra hasta 15 personas o entidades distintas por página.
- La búsqueda de funcionarios municipales y centrales se ejecuta en paralelo.
- Los resultados estáticos de remuneraciones y la API se cargan de forma independiente para mostrar primero la fuente que responda.
- Los índices se leen por páginas R2; no se ejecutan búsquedas masivas en D1.

Prueba de aceptación con `Kaiser`: el índice productivo contiene a Vanessa Kaiser y 15 filas de remuneración de Johannes Kaiser, además de otros homónimos. Sólo se agrupan cuando existe respaldo suficiente; una coincidencia nominal conserva su fuente y organismo separados.

## Limitación deliberada

Los artefactos R2 ignorados por Git no se sustituyen por datos de maqueta para compilar un worktree limpio. La compilación de promoción debe hidratar los manifiestos productivos mediante el flujo oficial y detenerse si faltan, en vez de fabricar archivos vacíos.
