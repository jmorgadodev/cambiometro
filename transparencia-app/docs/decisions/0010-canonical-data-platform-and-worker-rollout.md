# ADR-0010: Plataforma canónica D1/R2 y despliegue paralelo del Worker

## Estado

Superseded by ADR-0011

## Fecha

2026-08-12

## Contexto

Los datos de GitHub Releases, R2 y D1 habían divergido. Los ETL podían finalizar en verde aunque una fuente fallara, D1 no contenía el esquema canónico y el Worker existente debía conservarse como rollback. La aplicación necesita actualizar votaciones y cambios de mandato automáticamente sin descargar datasets masivos durante una petición web.

## Decisión

- GitHub Actions ejecuta las ingestas según la frecuencia de cada fuente.
- R2 conserva lotes inmutables, históricos y archivos grandes; el manifiesto vigente se cambia solo después de publicar y validar todos los objetos.
- D1 `transparencia-db` conserva entidades, registros, relaciones, mandatos y estado ETL normalizados para consultas del Worker.
- La materialización usa tablas de staging y transacciones idempotentes.
- El Worker final se crea como `cambiometro`; `transparencia-impulsacv` se conserva temporalmente como rollback.
- El dominio nuevo es `cambiometro.impulsacv.cl`. El dominio anterior se retira únicamente después de 24 horas estables; el Worker anterior se conserva siete días adicionales sin ruta.
- Las escrituras D1 no se exponen por HTTP. CORS abierto se limita a APIs GET públicas.

## Alternativas consideradas

### Reemplazar directamente el Worker existente

Rechazada porque elimina el rollback inmediato y mezcla la migración de datos con el cambio de dominio.

### Guardar todo en D1

Rechazada por el volumen de históricos CPLT y otros archivos masivos. D1 se reserva para datos normalizados y consultables.

### Consultar R2 o fuentes oficiales durante cada petición

Rechazada por latencia, fragilidad y costo operacional. La aplicación sirve datos previamente validados y materializados.

### Reutilizar producción como staging

Rechazada porque una migración o ETL defectuoso podría modificar el único conjunto válido. Se requiere una D1 aislada antes del lanzamiento.

## Consecuencias

- El despliegue depende de dos tokens Cloudflare separados: datos y Worker.
- Cada publicación debe mantener paridad de checksums entre manifiestos y D1.
- Los lotes defectuosos no sustituyen la última versión válida.
- Es necesario liberar capacidad o ampliar el límite de D1 para crear staging.
- El Worker antiguo no debe eliminarse durante el período de validación y rollback.
