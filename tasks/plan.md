# Plan de trabajo inmediato sin D1

## Alineación posterior a la prioridad 1 — 2026-09-14

La prioridad 1 de remuneraciones ya está publicada y verificada: el universo
central y el municipal se consultan desde R2, con cortes y manifiestos
independientes. Las fases siguientes no deben volver a reconstruir ese
universo ni moverlo a otra base gratuita.

### Alternativa de almacenamiento adoptada

- **R2 continúa como almacén público principal**: objetos comprimidos,
  índices precalculados y consultas paginadas por Worker.
- **D1 continúa fuera del camino público**: sólo metadatos operativos y
  preflight acotado cuando corresponda.
- **Firebase/Firestore no se adopta** para estas nóminas: el nivel gratuito
  tiene 1 GiB almacenado, 50.000 lecturas y 20.000 escrituras diarias, y su
  modelo de lectura por documento no es adecuado para un universo de millones
  de filas.
- **Supabase Free tampoco es reemplazo**: 500 MB de base de datos y 1 GB de
  almacenamiento no alcanzan para conservar el histórico completo.
- Antes de incorporar más datos a R2 se debe comprimir, deduplicar índices y
  verificar el espacio proyectado; el bucket observado quedó cerca del límite
  gratuito. No se cambia de proveedor para ocultar ese problema.

### Fases restantes, en orden de menor a mayor riesgo

#### N0 — Contrato común de normalización (iniciada)

- [x] Compartir reglas entre los ingestores central y municipal.
- [x] Preservar el nombre y el líquido originales cuando se normaliza.
- [x] Distinguir líquido válido de líquido no informado.
- [x] Añadir pruebas unitarias sin descargar el universo.

#### N1 — Auditoría de normalización por fuente (siguiente)

- [x] Crear un auditor reproducible que compare manifiestos locales y estado
      de salud sin leer filas masivas.
- [x] Generar una matriz sólo con manifiestos y muestras acotadas de R2.
      Evidencia: `docs/auditoria-normalizacion-productiva-2026-09-14.md`.
- [ ] Medir campos ausentes, formatos de fecha, montos, duplicados aparentes
      y períodos por fuente.
- [ ] No mezclar remuneraciones, asesorías, gastos, votaciones o agregados.
- [ ] No corregir valores originales; las reglas deben quedar versionadas.

#### N2 — Normalizadores específicos por dominio

- [ ] Aplicar el contrato a Cámara, Senado y Movimientos sin cambiar sus
      categorías ni rutas.
- [ ] Mantener un estado explícito para fuente incompleta, desfasada o no
      respondida.
- [ ] Conservar el último release válido cuando una fuente falle.

#### N3 — Historiales y cambios

- [ ] Construir altas, bajas, cambios de monto y cambios de organismo desde
      índices R2, no desde consultas masivas D1.
- [ ] Validar primero con una persona y un organismo; después ampliar por
      lotes.
- [ ] Publicar sólo si los conteos y checksums coinciden.

#### N4 — Eficiencia de almacenamiento y consulta

- [ ] Medir tamaño comprimido antes de cada publicación.
- [ ] Evitar duplicar fichas completas en índices secundarios.
- [ ] Separar corte vigente e histórico sin eliminar los releases originales.
- [ ] Bloquear la publicación si el tamaño proyectado deja un margen inseguro.

#### N5 — Presentación y promoción por bloques

- [ ] Revisar la interfaz sólo después de validar los datos.
- [ ] Probar desktop, móvil, paginación y rutas existentes.
- [ ] Promover una fuente por vez con rollback documentado.

Cada fase se cierra con: pruebas, comparación de conteos, verificación de
checksum, comprobación de consumo D1 y un commit independiente.

## Objetivo

Avanzar hoy en todo lo que no requiere leer, escribir ni materializar
`transparencia-db`. La estructura actual, las rutas, los nombres del menú y
`cambiometro-editorial` quedan fuera de alcance. Producción no se modifica
hasta completar los checkpoints de cada bloque.

## Reglas operativas

- R2 es la fuente pública y de prueba para datos masivos.
- D1 queda congelada hasta la medición post-reinicio.
- No se ejecutan ETL que materialicen D1.
- No se publican snapshots vacíos cuando una fuente falla.
- Se conserva el último release válido de cada fuente.
- La comparación local/producción se hace por `releaseId`, checksum, corte y
  alcance; la fecha distinta por sí sola no es un error.
- Se preservan todos los cambios sucios existentes en `cambiometro-public`.
- No se toca `cambiometro-editorial`.

## Estado inicial comprobado

- Cámara y Senado publicaron R2 correctamente el 12-09, pero su reconciliación
  por componente todavía no está cerrada.
- Movimientos publicó `data/movimientos.json`, pero la API busca otra ruta de
  artefacto y producción devuelve `r2-unavailable` con cero filas.
- ChileCompra falló el 07-09 por HTTP 403 y el intento produjo cero registros;
  el snapshot anterior debe conservarse.
- InfoLobby, DIPRES y Transparencia Activa están disponibles sólo de forma
  parcial o con distinta frescura.

## Fases ejecutables ahora

### Fase A — Congelar línea base y preparar rollback

**Descripción:** Registrar el commit, release R2, manifiesto, checksums y
estado de producción que se consideran válidos antes de corregir cualquier
integración.

**Criterios de aceptación:**

- [ ] Existe un inventario por fuente con release, checksum, corte, filas y
      estado.
- [ ] Se identifica el snapshot válido anterior para Movimientos y
      ChileCompra.
- [ ] No se reemplaza ningún archivo productivo durante la preparación.

**Verificación:** comparación de manifiestos R2 y smoke HTTP de las rutas
actuales. No usa D1.

**Dependencias:** ninguna.

**Archivos probables:** documentación de auditoría; manifiestos temporales de
comparación fuera del código público.

**Alcance:** S.

### Fase B — Reparar el contrato de lectura de Movimientos

**Descripción:** Alinear el artefacto que publica el ETL (`data/movimientos.json`)
con el artefacto que consume `/api/v1/records?source=movimientos`, sin cambiar
la navegación ni introducir D1.

**Criterios de aceptación:**

- [ ] La API encuentra el release R2 publicado.
- [ ] La respuesta deja de ser `sourceBackend=none` y devuelve registros
      paginados.
- [ ] Si el release falta, se conserva el snapshot anterior y la respuesta
      explica la indisponibilidad sin entregar cero como si fuera un corte real.
- [ ] El estado de `gob-cl` HTTP 403 queda como advertencia no bloqueante.

**Verificación:** prueba local con artefactos R2, build del Worker, prueba HTTP
en preview y smoke de producción sólo después de aprobación.

**Dependencias:** Fase A.

**Archivos probables:** `transparencia-app/lib/r2-records.*`,
`transparencia-app/workers/public-api/index.ts`, pruebas específicas de
Movimientos.

**Alcance:** M.

### Fase C — Reconciliar Cámara y Senado sin D1

**Descripción:** Comparar los releases recién publicados contra los manifiestos
de Cámara y Senado, separando votaciones, asistencia, personal de apoyo,
asesorías y gastos. El respaldo local será un replay del mismo ETL sólo si una
fuente vuelve a fallar.

**Criterios de aceptación:**

- [ ] Cada categoría tiene fuente, período, filas y checksum propios.
- [ ] Se distingue el conteo principal de los subconjuntos y componentes.
- [ ] Los períodos ausentes aparecen como ausentes, no como cero.
- [ ] Un fallo HTTP de una fuente mantiene el release anterior válido.
- [ ] El ETL no intenta materializar D1 en el camino programado.

**Verificación:** auditoría de manifiestos, ejecución de validadores locales con
artefactos R2 y pruebas de no materialización.

**Dependencias:** Fase A.

**Archivos probables:** scripts de reconciliación y documentación de auditoría;
no se modifica la interfaz en esta fase.

**Alcance:** M.

### Checkpoint 1 — Integración pública segura

- [ ] Movimientos devuelve datos desde R2 en preview.
- [ ] Cámara y Senado tienen matriz de conteos por componente.
- [ ] `npm test`, typecheck y verificación estática pasan sin usar D1.
- [ ] Las municipalidades, remuneraciones, transferencias y búsquedas no
      cambian sus rutas ni contratos.

### Fase D — Blindar fallos de fuentes externas

**Descripción:** Revisar los ETL que actualmente fallan o están desfasados,
empezando por ChileCompra, después InfoLobby, DIPRES y Transparencia Activa.
La prioridad es conservar el último release válido y no publicar resultados
vacíos.

**Orden:**

1. ChileCompra: HTTP 403 y protección contra release vacío.
2. InfoLobby: confirmar universo completo versus muestra.
3. DIPRES: confirmar que se presenta como agregado y medir frescura.
4. Transparencia Activa: confirmar alcance, historial e índices existentes.

**Criterios de aceptación:**

- [ ] Cada ETL produce un informe de fuente respondida, fuente fallida,
      filas obtenidas y acción tomada.
- [ ] Una respuesta vacía no sobreescribe un release válido sin una regla
      explícita y evidencia.
- [ ] Los desfases de fecha quedan visibles por fuente.
- [ ] Ningún bloque requiere D1 para verificar sus datos.

**Dependencias:** Checkpoint 1.

**Alcance:** M por fuente, ejecutado secuencialmente.

### Fase E — Calidad y consistencia de datos

**Descripción:** Auditar normalización, duplicados, períodos, montos ausentes,
registros que aparecen/desaparecen y consistencia entre original y proyección.

**Criterios de aceptación:**

- [ ] Se separan `$0`, monto no publicado, registro sin remuneración y dato
      proporcional posible.
- [ ] Los nombres normalizados no reemplazan el valor original.
- [ ] Los conteos derivados indican si son completos, parciales o muestras.
- [ ] Los cambios de release pueden explicarse como alta, baja, modificación
      o cambio de alcance.

**Dependencias:** Fases C y D.

**Alcance:** M.

### Checkpoint 2 — Datos listos para promoción

- [ ] Todos los artefactos tienen checksum y release identificable.
- [ ] Cero rutas públicas consultan masivamente D1.
- [ ] Los fallos de fuente no borran el dato anterior.
- [ ] La UI no muestra datos internos de R2/D1.

### Fase F — Validación y promoción controlada

**Descripción:** Ejecutar la batería completa sólo cuando los bloques anteriores
estén verdes. Promover por bloque, nunca junto con un ETL incierto.

**Criterios de aceptación:**

- [ ] Tests, typecheck, build, verify, SEO y verificadores estáticos pasan.
- [ ] Preview revisado en desktop y móvil.
- [ ] Smoke HTTP de health, sources, Movimientos, Cámara, Senado,
      Municipalidades y Remuneraciones.
- [ ] Producción se revisa después de publicar.

**Dependencias:** Checkpoint 2 y, para la parte de D1, medición post-reinicio.

## Trabajo reservado para mañana

Sólo estas acciones deben esperar al reinicio:

1. Medir D1 después del reset sin ejecutar ETL masivo.
2. Confirmar que no hay lecturas nuevas inesperadas.
3. Verificar que las compuertas de materialización siguen bloqueando los
   schedules.
4. Si la cuota está limpia, ejecutar únicamente un preflight pequeño y
   documentar el resultado.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Corregir Movimientos directamente en producción | Alto | Probar primero con el release R2 actual en preview |
| Fuente externa devuelve cero | Alto | Conservar último release válido y bloquear publicación vacía |
| Confundir local antiguo con error | Medio | Comparar release, checksum, corte y alcance |
| ETL de Cámara/Senado sobrescribe categorías | Alto | Reconciliar componentes antes de tocar UI |
| Reaparición de consumo D1 | Alto | No ejecutar D1 hoy; compuertas manuales y preflight mañana |
| Cambios sucios del usuario | Alto | No limpiar, resetear ni incluir archivos no relacionados |

## Resultado esperado al terminar el trabajo inmediato

Antes del reinicio de D1 deben quedar resueltos o claramente aislados:

- Movimientos servible desde R2 o bloqueado con causa exacta.
- Cámara y Senado con reconciliación verificable.
- ChileCompra protegido frente a HTTP 403 y resultados vacíos.
- Informe de frescura y calidad para las restantes fuentes.
- Un único orden de promoción, sin mezclar ETL, UI y D1.
