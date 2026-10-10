# Personal de apoyo Senado: septiembre y revisión diaria

## Referencia y alcance

Worktree canónico: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama puntual basada en `origin/main` `4cd5cf3e`:
`codex/senado-apoyo-septiembre-20261008`. No desplegar PR #719 ni sustituir
sus correcciones pendientes: permanece en `codex/confianza-evidencia-20261007`.

Autorización de Jorge: actualizar y publicar apoyo Senado, revisar diariamente
y publicar sólo cambios válidos. No habilita D1 remota ni un bypass de costes.
El diseño y las demás fuentes no cambian. Cámara conserva su release bloqueado.

## Causa comprobada

- ETL Senado `37339561783`, 05-10-2026: success; 3.407 filas, enero–agosto.
- API oficial filtrada por año 2026/mes 9: 420 filas. Muestra consultada publicada
  el 06-10-2026 (`publishedAt=2026-10-06T17:17:53.186Z`). No se generaliza esa
  hora a las 420 filas sin recorrerlas.
- Producción consultada el 08-10-2026: ficha Pedro Araya selecciona agosto;
  pin `data/personal-apoyo.json` SHA
  `da2f4319ea9a5b81f40bed4c97005281a5867abd9086c17641c78bc650a171a7`.
- Calendario anterior sólo lunes: la publicación oficial posterior a la última
  ejecución no podía aparecer antes del siguiente ciclo del 12-10-2026.
- Cámara `37333599905` falló con `PERSONAL_APOYO_SOURCE_BLOCKED`; no es la misma causa.

## Cambio y prevención

- Cron Senado diario a las 07:30 UTC (04:30 Chile en horario de verano).
- Se conserva el nombre histórico del workflow para no romper sus consumidores.
- Recuperar y verificar checksum del baseline R2 antes de extraer, como ya existía.
- Comparar candidato validado contra baseline, ignorando sólo `generado_en` y
  orden de claves/filas y los metadatos `retrieved_at`/checksum del HTML variable
  de la política de asignaciones. Montos, reglas, evidencias de transferencias,
  períodos, duplicados, nulos y ceros permanecen
  distinguibles; ninguna fila se modifica para comparar.
- Contenido idéntico: cero PUT, release nuevo, despliegue Pages o espera de guardia
  de publicación. La consulta diaria al origen sí consume peticiones.
- Cambio: guardas existentes de tamaño a nivel de cuenta, publicación `--skip-d1`,
  puntero de activación al final y rollback anterior. No se agregan backups.
- `--skip-d1` se respeta también en la ruta de error de activación.

## Validación y cierre

Seis regresiones RED antes del cambio; 31 pruebas dirigidas GREEN después.
Tipos, lint de archivos modificados, arquitectura, enlaces y calendario aprobados.
La suite completa encontró únicamente el contrato de cron semanal antiguo
(1.590 pruebas aprobadas y una fallida); contrato actualizado y sus 22 pruebas
aprobadas. El CI limpio debe confirmar la suite completa antes de fusionar.
Calidad, CI, promoción, conteos de septiembre, preservación Cámara, estado
productivo y repetición sin cambios: pendientes de completar. No declarar cerrado
el ciclo ni funcionamiento diario hasta registrar esas evidencias aquí.

Este cierre puntual no certifica identidades o contratos de todas las filas,
otros años, la recuperación de Cámara ni el 100% de la auditoría global.

## Promoción y evidencias del 08-10-2026

- PR #720 fusionado; commit main `34b7507435e039ebc0ffd10dd10a66695bf1693c`.
  Quality `37764998931`: 1.591 pruebas aprobadas. Build/E2E `37764998811`:
  success. No se incluyó PR #719.
- ETL main `37765919661`: success. Candidato distinto del baseline; publicación
  R2 y entrada estática aprobadas con `--skip-d1`.
- Snapshot nuevo: `2026-10-08T11-00-15-486Z`, 1.278.980 bytes, SHA
  `e421cd0f25b093aab2077ff527eb660934fffeab5e5d3b9c03d433f45b92e99e`.
- 3.827 filas Senado + 1.084 Cámara = 4.911. Septiembre: 420; enero–agosto
  siguen disponibles. Huella de contenido de Cámara idéntica al insumo anterior.
- Contraste acotado con la API oficial para Pedro Araya en septiembre: nueve
  filas y suma de campo `monto` $13.730.597, iguales al candidato. No es sueldo
  personal del senador ni prueba de todas las oficinas.
- Preflight conjunto tras ambos publicadores: 8.531.393.574 bytes proyectados;
  pico 8.531.485.998. Aumento neto 2.670.546 bytes (2,67 MB), bajo 95% de
  10.000.000.000. Uso aproximado 85,31%: supera advertencia de 80%, no se
  declara margen ilimitado ni una lectura de facturación/operaciones mensual.
- Refresco Pages de estos datos: `37767333400`, en ejecución al registrar.
- Replay sin cambios solicitado: `37767503461`; pendiente, serializado tras Pages.
- La compilación UI redundante del push (`37765918697`) fue cancelada antes
  de publicación: este PR no cambia interfaz; el refresco de datos mantiene sus
  puertas completas. No se cancelaron ETL ajenos ni se omitieron controles.

Pages `37767333400` terminó success; deployment `956f43f6`, cuatro controles
productivos móvil/escritorio y SHA público iguales al candidato. Septiembre
seleccionado en Pedro Araya/Vanessa Kaiser; agosto sigue consultable.

El replay `37767503461` no fue un no-op: pagos y reglas eran iguales, pero
`asignacion_senado_2026.retrieved_at` y el hash del HTML completo variaron por
consulta. Generó otro snapshot SHA
`e59e787a7bf4d1149061fbc47591a0ab5254962425b6055aa48daa8fe2b4072d`,
sin cambio en las 4.911 filas. No se borró para ocultar el intento.
Nuevo refresco `37768751292` conserva el último candidato. Corrección específica
con prueba RED/GREEN para ignorar sólo esos metadatos en la comparación; los
originales y sus checksums siguen disponibles en el release.
PR #721 fusionado: main `7ca4ca9e8189624a29fb2b9e671eb732a1985163`.
Quality `37769445392`: 1.592 pruebas; Build/E2E `37769445150`: success.
Replay de comprobación `37770276372`: success, `changed=false`; las dos
publicaciones omitidas. Huella de baseline y candidato idéntica:
`82e8aab1a4e64eea0b13b292eb54726549ffd5e87513115485ea1b6380022041`.
Refresco Pages `37770567598`: success en decisión, build y publicación omitidos.
Guardia `37770567457`: success, espera de publicación omitida. **100% del punto
actualización de septiembre/revisión diaria/no-op**, no del proyecto global.
El UI-only redundante del push `37770274519` se canceló antes de publicar:
esta corrección sólo afecta al workflow, no al código de interfaz.

El segundo Pages `37768751292` terminó success; deployment
https://cfd4b9e5.cambiometro.pages.dev, rollback https://956f43f6.cambiometro.pages.dev.
El dominio personalizado devuelve el último SHA `e59e787a…`; ReleaseSet público
SHA `eba173d94caf86aa2947c34fc7ff3e4a500cc6d097f2b124c585b5c4d1843dd2`.
Cuatro controles de fichas móvil/escritorio reejecutados: 4/4, septiembre inicial,
agosto consultable, cero solicitudes API/D1. No acredita búsquedas globales.
Preflight del replay anterior: 8.533.951.884 bytes proyectados tras publicar,
pico 8.534.044.308, aproximadamente 85,34% del límite configurado. No equivale
a lectura de facturación mensual ni garantiza coste de operaciones.

## Continuación de C03: concordancia oficial del corte de septiembre

Comprobación limitada al endpoint oficial filtrado por año 2026/mes 9, una
página de 500 como máximo, sin recorrer años ni descargar universos nacionales.
Consulta válida HTTP 200, 273.891 bytes, 420 filas y 51 oficinas. Se reutilizó
el parser/validador existente. Una primera consulta diagnóstica falló al asumir
la envoltura de respuesta; no se publicaron datos ni se ocultó ese intento.

- Multiconjunto de oficina, año, mes, nombres originales, cargo, monto y calidad
  jurídica: idéntico en fuente y snapshot publicado, sin fusionar personas.
- Cero montos ausentes; tres ceros explícitos preservados; cero duplicados
  exactos por esos campos. No prueba personas únicas ni pago bancario.
- Respuesta oficial SHA
  `d49d00bec22ac77cbf417b31595a5852dbc41a7612915deb78cbeed8592b2e92`.
- Evidencia reproducible local:
  `.ci-confianza-audit/senado-septiembre-source-check-20261008.mjs` y `.json`.
- Dos GET oficiales incluyendo diagnóstico; cero D1 remota y escrituras R2
  durante esta comparación. El ETL autorizado antes sí publicó el corte.

Esta entrega cierra concordancia con el endpoint para septiembre del Senado,
no contratos individualizados, otros componentes de C03, otros meses o Cámara.
El avance global de Confianza permanece 83% y PR #719 sigue sin promover.
