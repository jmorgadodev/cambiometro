# ADR-0013: Escritura D1 acotada para el canal de solicitudes Ley 21.715

## Estado

Aceptada

## Fecha

2026-08-19

## Contexto

La Ley 21.715 (vigente el 14-12-2026) obliga a contar con un canal de solicitudes con registro interno verificable. El registro no puede ser remoto a la plataforma ni depender de procesos ETL programados: la solicitud llega por HTTP al Worker web y debe quedar almacenada de inmediato con su estado y fecha.

El ADR-0011 establece que el bundle web de staging es de solo lectura y que "los ETL remotos son los únicos procesos autorizados para escribir" en D1. Ese modelo cubría la materialización de datos públicos, pero no contempla un canal de solicitudes ciudadanas.

## Decisión

- Se autoriza una excepción acotada y verificable: las rutas runtime (`app` y `lib`) pueden ejecutar DML únicamente contra las tablas del canal Ley 21.715: `data_requests`, `security_events` y `request_rate_events`.
- La prueba automática `deploy-runtime-ci.test.ts` cambia de "cero escrituras" a "cero escrituras fuera de la allowlist", escaneando el nombre de tabla objetivo de cada sentencia `INSERT`/`REPLACE`/`UPDATE`/`DELETE`.
- La materialización de datos públicos sigue siendo exclusiva de los ETL (etapa `stage_*` y promoción validada) conforme a ADR-0011.
- Las tablas de la allowlist tienen retención documentada: `data_requests` 3 años (plazo legal), `security_events` 12 meses, `request_rate_events` 7 días.

## Alternativas consideradas

### Mover el registro a un Worker ETL por cola

Rechazada: agrega infraestructura de colas y latencia a un canal cuya ley exige registro inmediato, y duplica el alcance de ETL fuera de su propósito de datos públicos.

### Almacenar en R2 objetos inmutables

Rechazada: pierde la capacidad de consulta/estado y de rate limiting transaccional con contadores, que D1 resuelve en una sola base.

### Mantener staging sin escrituras y solo permitirlas en producción

Rechazada: el test CI no distingue ambientes; la allowlist aplica por igual y staging hereda el comportamiento (puede recibir solicitudes de prueba sin tocar los datos públicos).

## Consecuencias

- Se conserva la garantía de ADR-0011 para todos los datos públicos: ninguna ruta runtime escribe en tablas de datos.
- La superficie de escritura queda acotada a tres tablas auditables, con volúmenes mínimos y retención definida.
- El Worker web sigue sin poder modificar datos de materialización; staging y producción comparten la misma política de código.
