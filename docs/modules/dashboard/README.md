# Dashboard parlamentario

## Contrato y responsabilidad

Filtros por cámara, parlamentario, período, categoría e ítem; evolución temporal y detalle. Separar sueldo del parlamentario y recursos de función; indicar cobertura. No habilitar una vista consolidada si mezcla meses o unidades incompatibles.

## Origen, ejecución y artefactos

Ejecutores: Consume Gastos, Personal y Dietas; no extrae datos nuevos.

Artefactos: Ruta /dashboard con acceso desde Cámara y, en esta entrega local, desde el encabezado tras Metodología.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: Probar filtros combinados, meses vacíos, totales por categoría, comparación de cámaras y navegación móvil.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/dashboard/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.

## Implementación local — 19-11-2026

Ruta `/dashboard`; acceso secundario desde Cámara. Modelo y contrato en `lib/parliamentary-dashboard.ts`, adaptador servidor en `lib/parliamentary-dashboard-data.ts`, interfaz y CSS propios en `components/dashboard/ParliamentaryDashboard*`. [Plan y aceptación](../../../tasks/dashboard/plan.md), [evidencia y comandos](../../../tasks/dashboard/evidence.md).

El rango predeterminado y mínimo se inicia en marzo de 2026, según el último ajuste solicitado. Los filtros se conservan en URL e historial. Los acumulados se calculan por componente. Por solicitud posterior se añade un total referencial de las cuatro tarjetas, con alcance y posibles solapamientos explícitos. Las categorías operacionales son agrupaciones de lectura (traslados, oficinas/servicios, actividad/comunicación y otros); el ítem oficial permanece visible. El dataset conserva las últimas referencias oficiales por persona y mes. La interfaz aplica la última referencia positiva como estimación fija en todos los meses del rango; no acredita una serie histórica de pagos o reajustes. Asesorías externas sólo se muestran cuando están incorporadas como tales; no se inventa un desglose equivalente de Senado.

La vista publicada consume el pin `.ci-data-version/release-set.json` y verifica archivos de gastos y personal. Para desarrollo, `scripts/prepare-dashboard-local.mjs` reutiliza candidatos guardados que coincidan byte a byte con el release, sin extracción. `CAMBIOMETRO_DASHBOARD_LOCAL_DATA` activa ese bundle local explícito; la publicación con `CAMBIOMETRO_PUBLISHED_RELEASE_ONLY=1` lo rechaza. Sin entradas verificadas se muestra preparación pendiente. No copiar los JSON de Git para completar ausencias.

## Renovación BI posterior — sólo local

Panel lateral plegable, selección múltiple de partidos/personas, componentes mediante botones y comparación independiente por grupo. Partido según nómina vigente, no afiliación histórica. URL admite valores repetidos y conserva enlaces singulares anteriores. CSV añade partido/estado del importe. El cero solicitado es de presentación: se muestra $0 con estado de ausencia, conservando null en datos y exportación. [Plan](../../../tasks/dashboard/bi-navigation-plan.md) y [evidencia](../../../tasks/dashboard/bi-navigation-evidence.md).

## Interacción de gráficos — sólo local

Tooltips accesibles en puntos y barras, animación con movimiento reducido y barras mensuales adicionales. Marzo 2026 como mínimo/default, sin borrar datos anteriores. [Plan](../../../tasks/dashboard/chart-interaction-plan.md) y [evidencia](../../../tasks/dashboard/chart-interaction-evidence.md).

## Dieta mensual, total y catálogo — incremento local

La dieta estimada entra en tarjetas, comparación, evolución, barras y CSV en cada mes seleccionado. CSV añade tipo de importe y mes oficial de referencia; no modifica el dataset. Referencias idénticas se deduplican; importes contradictorios en el último mes se retienen sin elegir arbitrariamente. La tarjeta muestra acumulado y referencia mensual. El total suma las cuatro tarjetas y advierte solapamientos. Catálogo de paneles en /dashboard y acceso desde el header. [Plan](../../../tasks/dashboard/reference-total-navigation-plan.md) y [evidencia](../../../tasks/dashboard/reference-total-navigation-evidence.md). Sólo local.


## Explorador parlamentario — 21-11-2026 (vigente en esta rama local)

Esta entrega reemplaza en `/dashboard/` el panel anterior por cinco vistas: Panorama, Explorar, Comparar, Personal de apoyo y Registros. Reutiliza el modelo financiero, filtros compatibles, referencias de dieta y entradas publicadas. Las descripciones anteriores de un total combinado son históricas: esta implementación no suma componentes que pueden solaparse. Ausencia conserva null; cero informado conserva 0.

### Arquitectura

`build-parliamentary-explorer.ts` verifica fuentes contra el release, concilia cada parlamentario/mes/componente con el modelo existente y genera un resumen compacto y detalles por mes/cámara/componente en `public/data/parliamentary-explorer/`. Cada partición tiene bytes, SHA-256 y release. La página incorpora el resumen; los registros administrativos se descargan sólo cuando se necesitan, se verifican y se reutilizan en caché. No hay endpoint nuevo ni consulta a D1, R2 o Workers por cada filtro.

Contratos y cálculos: `lib/parliamentary-explorer.ts`; adaptadores build: `lib/parliamentary-explorer-build.ts`, `lib/parliamentary-explorer-projection.ts`, `lib/parliamentary-explorer-data.ts`; interfaz: `components/dashboard/explorer/`. El modelo anterior sigue disponible para otros consumidores y como reconciliación. Las personas únicas de apoyo no están acreditadas: se cuentan registros administrativos y equipos; `party-support.totalPersonas` queda nulo, con `totalRegistros` explícito.

### Revisión local reproducible

Desde `transparencia-app`, instalar desde lockfile. `node scripts/prepare-parliamentary-explorer-local.mjs` verifica candidatos guardados contra el release público y prepara recibos, sin ETL. Se detiene si el caché no coincide: no completar desde JSON antiguo.

En PowerShell, establecer `CAMBIOMETRO_DASHBOARD_LOCAL_DATA=artifacts/dashboard/local-data.json` y `CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT=artifacts/dashboard-explorer/input/source-receipt.json`. Ejecutar `npm run pages:build`. Estas variables son exclusivas de revisión local y están prohibidas en una construcción publicada.

`node scripts/preview-parliamentary-explorer.mjs` sirve el export estático y su CSP en `http://127.0.0.1:3201/dashboard/`. Para comprobarlo: establecer `EXPLORER_QA_BASE=http://127.0.0.1:3201` y ejecutar `node scripts/verify-parliamentary-explorer.mjs`. Después ejecutar `node scripts/verify-parliamentary-explorer-boundaries.mjs` para validar fallo/reintento, cero publicado y mes ausente. Evidencia ignorada en `artifacts/dashboard-explorer/`; no publicar esos respaldos.

### Publicación futura y recuperación

Esta entrega no autoriza push, PR ni despliegue. Tras aprobación, integrar por el procedimiento existente `pages-ui-refresh`: hidratar todas las entradas actuales desde R2, fijar `.ci-data-version/release-set.json`, eliminar overrides locales y ejecutar el build publicado con sus guardas. Validar preview y promover el mismo artefacto mediante `pages-promote-artifact`; conservar SHA, release-set y destino anterior de rollback. No usar el export de laboratorio como artefacto publicable porque otras fuentes de módulos ajenos no se han hidratado integralmente.

Los detalles cambian de nombre con sus hashes; publicar resumen y particiones juntos. Si falta una partición, hay error visible y reintento; no sustituirla con otra versión. Si falla reconciliación/integridad, conservar el último artefacto válido. Nunca borrar datos R2 ni reactivar cron para corregir una interfaz.

[Entrega, evidencias y límites](../../../tasks/dashboard/entrega-explorador-20261121.md).


## Refinamiento de consulta — 21-11-2026

Institución y modo Un mes/Rango quedan visibles fuera del panel avanzado; las fechas reales siguen siendo la fuente de la URL. La lista de meses se deriva de los hechos publicados de la cámara, excluyendo referencias estimadas de dieta. No se crean meses ni importes. La evolución muestra un componente seleccionado y mantiene puntos, detalle mensual y SVG. Los desgloses monetarios de paneles usan orden numérico descendente y omiten componentes ajenos.

Comparación y filtros son estados distintos: agregar no navega ni restringe; el contador y la marca En comparación responden a la URL actual. Los filtros contextuales de miembros/partidos/regiones/distritos/cargos se agregan a la dimensión correspondiente. Restablecer filtros vacía explícitamente las selecciones múltiples, conservando participantes de comparación. Categoría/ítem/mes mantienen su alcance de selección única. Categorías y períodos individuales en Comparar se abren bajo demanda.

Personal presenta los tres indicadores principales, monto por cargo y monto por parlamentario. Se retira el bloque Composición de los equipos. El detalle de un equipo/mes puede mostrar Integrantes identificados en la nómina únicamente si todos sus registros contienen nombres completos, una observación por nombre y ninguna repetición ortográfica normalizada. No se cuentan contratos como personas ni se deduplican nombres repetidos para inventar identidades; ante repetición o datos parciales se omite el conteo. No se acumula entre meses o equipos. La metodología completa permanece en Fuentes y alcance y el respaldo técnico individual, cerrado por defecto.

Antecedente histórico del refinamiento, corregido en la entrega siguiente: el contraste 205/204 era una asociación conservadora: `sen-030` Paulina Vodanovic Rojas tiene una oficina fuente `VODANOVIC PAULINA`, pero la regla de esa entrega exigía también ROJAS. La fuente contiene 63 registros de marzo a septiembre (73 incluyendo enero/febrero). No es una nómina inventada ni prueba de que carezca de equipo. Esta entrega no reasigna observaciones por nombre incompleto ni cambia los montos; validar una asociación oficial y sus consumidores corresponde a una corrección de datos separada.

Prueba reproducible de los flujos refinados: `EXPLORER_QA_BASE=http://127.0.0.1:3201` y `node scripts/verify-explorer-refinement.mjs`. Evidencia en `artifacts/dashboard-refinement/`. Se conserva el procedimiento de build/publicación/rollback anterior; no se autorizó despliegue.

## Identidad y contexto normativo — 22-11-2026

La equivalencia oficial `sen-030`/1450 ↔ `VODANOVIC PAULINA` está resuelta en `lib/senate-financial-identity.ts` para todos los consumidores financieros. Se conservan oficina, nombre, importe y mes originales. No añadir búsquedas difusas ni excepciones mensuales en componentes. La revisión puntual también elimina la atribución de Juan Enrique Castro a Juan Luis Castro en los precálculos de fichas. [Entrega, conciliación y límites](../../../tasks/dashboard/entrega-identidad-normativa-20261122.md).

El catálogo [Normativa](../normativa/README.md) y `NormativeInfo` centralizan el alcance legal por ítem original y vigencia, bajo demanda. No inferir restricciones desde categorías visuales ni tratar dieta como asignación.

En preparación local de un export completo, hidratar también el índice mensual/shards coherentes con los subconjuntos verificados; un caché mensual antiguo puede ocultar meses nuevos en las fichas. Sólo para laboratorio se puede reutilizar `writeExpensePeriodArtifacts` tras verificar y respaldar entradas. En builds publicados el lector verifica índice y shards contra el release-set fijado; no usar un índice derivado de laboratorio como reemplazo del publicado. La entrega anterior conserva su valor histórico; la corrección posterior y sus recibos prevalecen en identidad.
