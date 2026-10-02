# Guardas del candidato 38 bis — cierre parcial

Worktree `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, rama `codex/38bis-candidate-guards-20261002` desde `origin/main`. Sin cambios de interfaz, D1, backup ni eliminación de histórico.

## Conservación y límites

El workflow exige el snapshot **y** el histórico publicados en R2. Un error de lectura no crea línea base vacía ni restaura un histórico Git. Comprueba checksum/filas/períodos antes de extraer. Período ausente o inválido se rechaza, no se completa con la fecha de ejecución.

Se reutiliza el contrato común del candidato: cero/parcial, checksum, conteo, duplicados exactos del corte candidato y retroceso de período bloquean la publicación. Corrección del mismo mes no puede reducir filas; un mes nuevo admite como máximo 10% de reducción, y una variación mayor requiere revisión, no promoción automática. No se asignan identidades de personas mediante esos hashes de fila.

Históricos ya publicados se verifican por período, filas y checksum y se conservan sin deduplicar. Hay ocho repeticiones aparentes en el histórico: no prueban que sean registros inválidos ni autorizan eliminarlos. Mes/filas/checksum idénticos son no-op: no se suben objetos ni aliases. Un mes nuevo con las mismas filas sí es distinto; la clave incorpora mes y checksum para no sobrescribir el mes anterior. Preflight de almacenamiento de toda la cuenta precede las ocho escrituras existentes; no sustituye las métricas de operaciones/facturación pendientes en O05. Cola compartida no cancela una publicación activa.

## Evidencia y lo que falta

Release R2 vigente: julio 2026, 1.590 filas, checksum `c6fe851b6dc0b2de8ba0eb4d80fe699636165a7fe41b61f8b2411252d44101dc`. Histórico: 18 períodos, 29.703 filas; todos sus checksums/filas/períodos comprobados. Lectura acotada medida: 8.858.500 bytes, sin escrituras ni D1. Replay de ese release contra sí mismo devuelve `unchanged`.

Origen configurado: `https://comision38bis.gob.cl/registro-publico?csv-todo`; página oficial `https://comision38bis.gob.cl/registro-publico`. La comprobación acotada del CSV se detuvo al superar el presupuesto de 10 MB, sin publicar. La página oficial responde 200 y reporta julio; el parser HTML produce 1.595 filas frente a las 1.590 vigentes. Esa diferencia **no se promovió**: requiere conciliación del candidato con la fuente antes de dar por cerrada la extracción/publicación. No se presenta un total distinto como correcto por sólo pasar el esquema.

Quince pruebas dirigidas, tipos, lint dirigido sin errores y calendario de 18 workflows aprobados. Modo `verify_release_only=true` verifica el release productivo sin consultar origen ni escribir R2. CI y ejecución remota quedan pendientes al crear este cambio.

No cierra O13: faltan incorporación al pin estático/manifest externo O08, conciliación del candidato actual y validación API/ficha tras una promoción individual. La facturación no fue medida por Analytics; sólo el almacenamiento dispone de preflight automático. Rollback: release/histórico vigentes permanecen intactos.
