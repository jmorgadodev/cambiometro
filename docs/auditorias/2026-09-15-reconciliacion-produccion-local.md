# Reconciliación de producción frente a snapshot local

**Fecha de ejecución:** 2026-09-15 01:49:51 UTC  
**Origen productivo:** `https://cambiometro.impulsacv.cl/api/v1/sources`  
**Método:** comparación de metadatos y conteos; no se descargaron universos ni se consultó D1 para búsquedas masivas.

## Resultado

| Clasificación | Fuentes |
| --- | ---: |
| Coincidencia de conteo | 3 |
| Producción más fresca que local | 5 |
| Diferencia de alcance o categorías | 7 |
| Diferencia inexplicada | 0 |
| Desajuste con `source-health` | 2 |

Una diferencia de conteo no se interpreta como pérdida mientras no se haya reconciliado el alcance y la fecha del release.

## Hallazgos relevantes

| Fuente | Producción | Local | Clasificación | Lectura correcta |
| --- | ---: | ---: | --- | --- |
| Cámara | 58.751 | 2.750 | Alcance | Producción incluye asistencia y votaciones; gastos queda como componente separado con 16.275 registros. |
| Senado | 1.428 | 7.002 | Alcance | El snapshot local combina categorías; producción mantiene votaciones y gastos como componentes separados. |
| ChileCompra | 74.142 | 1.915.039 | Alcance | Producción expone el corte vigente; local conserva histórico y cortes acumulados. No son universos equivalentes. |
| DIPRES | 247.287 | 92.286 | Alcance | Son datos agregados con distinto alcance; no deben compararse como fichas individuales. |
| InfoLobby | 71.467 | 60.523 | Frescura | Producción tiene un corte posterior al snapshot local. |
| Transparencia Activa | 1.226.913 | 1.218.136 | Frescura | Producción tiene una publicación posterior; no es una pérdida atribuible al sitio. |
| Contraloría | 310 | 291 | Frescura | Producción tiene una publicación posterior. |
| Ley 19.862 | 62.172 | 59.361 | Frescura | Producción tiene una publicación posterior. |

## Desajustes de calidad pendientes

- ChileCompra: `source-health` local declara 888.693 registros mientras el catálogo local conserva 1.915.039. Debe separarse explícitamente el corte vigente, el histórico y el universo del manifiesto antes de calcular cobertura.
- DIPRES: `source-health` local declara 476 registros frente a 92.286 en el catálogo local. La diferencia confirma que se mezclan resúmenes de salud con artefactos de distinto alcance.

## Decisiones de seguridad

- Producción es la referencia para el conteo vigente.
- El snapshot local se usa para auditoría histórica, no para reemplazar producción.
- No se calculan porcentajes de cobertura con estas cifras hasta separar categorías y períodos.
- No se modificó R2, D1 ni ningún release productivo durante esta auditoría.
- Las categorías de Cámara y Senado no se sumarán entre sí ni se mezclarán con remuneraciones.

## Estado de almacenamiento R2

La auditoría remota del mismo ciclo informa:

- Uso: `9.016.336.751` de `10.000.000.000` bytes (`90,16%`).
- Estado: `growth-blocked`; no se permiten nuevas publicaciones grandes.
- Objetos: `8.362`.
- Proyección central candidata: aproximadamente `4,48 GB` y `5.121` objetos; permanece sin publicar.
- Duplicados detectados: aproximadamente `66 KB` recuperables potenciales; quedan sin borrar porque el inventario no prueba que sus claves sean prescindibles.

Esta capacidad impide promover una nueva proyección central hasta contar con una decisión explícita de retención/archivo y una validación de que el release no contiene períodos futuros.

## Próximo paso verificable

Reconciliar primero Cámara y Senado mediante una matriz por categoría, período y release. Después se podrá validar el histórico de ChileCompra y los resúmenes agregados de DIPRES sin alterar las rutas públicas actuales.

## Prueba de historial acotado desde R2

Se ejecutó una lectura de prueba para **Alejandro Fernandez Troncoso** entre los releases `2026-08-30T08-05-27-795Z` y `2026-09-02T03-28-30-598Z` de `funcionarios-v1`.

- Se encontraron 1 fila en cada release.
- La identidad, organismo y período permanecieron iguales.
- El monto bruto cambió de `$1.614.067` a `$60.000`.
- La clasificación resultante fue `source-correction`.
- Se leyeron 10 objetos R2 en total, sin escaneo masivo ni consulta D1.

La muestra confirma el mecanismo de historial, pero no constituye todavía una validación global de todas las personas o períodos.

## Frescura de las fuentes CPLT

La comprobación de validadores remotos detectó cambios en las cuatro nóminas frente al snapshot anterior:

- Planta: validador cambiado.
- Contrata: validador cambiado.
- Honorarios: validador cambiado.
- Código del Trabajo: validador cambiado.

Por tanto, la ejecución central en curso está justificada por cambios reales de fuente. El validador sólo demuestra que el archivo cambió; no sustituye la validación de períodos, conteos, cobertura y calidad antes de publicar.
