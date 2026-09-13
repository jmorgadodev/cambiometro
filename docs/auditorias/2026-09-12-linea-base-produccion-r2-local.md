# Línea base producción / R2 / local — 12 de septiembre de 2026

## Alcance

Se comparó el catálogo expuesto por producción con el inventario local del
proyecto maestro. La consulta fue sólo de lectura y no ejecutó SQL, ETL,
materialización D1 ni despliegue.

Referencia pública consultada:

- `GET https://cambiometro.impulsacv.cl/api/v1/sources` — HTTP 200.
- `GET https://cambiometro.impulsacv.cl/api/v1/health` — HTTP 200.
- API productiva: `cambiometro-public-api`.
- Backend público declarado: R2; `publicD1Reads=false`.

## Conteos vigentes declarados por producción

| Fuente | Registros declarados | Estado | Corte/observación |
|---|---:|---|---|
| Cámara | 58.751 | Parcial | Asistencia y votaciones incluidas; gastos separados |
| ChileCompra OCDS | 74.142 | Parcial | Corte vigente separado del histórico |
| Contraloría | 310 | Parcial | Catálogo de informes y recursos publicados |
| Transparencia Activa CPLT | 1.226.913 | Parcial | Datos publicados en el lake |
| DIPRES | 247.287 | Parcial | Datos agregados; no fichas individuales |
| INE Censo 2024 | 346 | Conectado | Catálogo territorial |
| InfoLobby | 60.615 | Parcial | Catálogo declara universo; consulta por particiones |
| InfoProbidad | 16.058 | Parcial | Catálogo declara universo; consulta por particiones |
| Ley 19.862 | 62.172 | Parcial | Release publicado en R2 |
| Senado | 1.428 | Parcial | Votaciones y gastos se contabilizan aparte |
| SERVEL | 23.894 | Parcial | Histórico y documentos electorales |
| SINIM | 3.105 | Parcial | Períodos 2001–2025 |

Los conteos de componentes (por ejemplo gastos, votaciones o asistencia) no se
suman automáticamente al conteo principal: algunos son subconjuntos o
particiones relacionadas. El total del encabezado del sitio tampoco debe
interpretarse como la suma aritmética de estas fuentes.

## Comparación con local

El inventario local `transparencia-app/data/etl/source-inventory.json` fue
generado el `2026-08-21T10:12:13Z`; producción expone publicaciones más
recientes, incluyendo actualizaciones del 12 de septiembre. Por tanto, una
diferencia entre ambos no es por sí sola un error: primero debe compararse el
`releaseId`, checksum, fecha de corte y alcance de cada fuente.

La estructura de fuentes y sus identificadores se mantiene alineada entre el
inventario local y el catálogo productivo. Las diferencias observadas quedan
clasificadas como diferencia de frescura hasta que exista un manifiesto de
mismo release que demuestre otra cosa.

## D1 y repositorio histórico

- Producción declara `publicDataBackend=r2` y `publicD1Reads=false`.
- El repositorio remoto `jmorgadodev/transparencia.impulsacv.cl` está archivado
  y privado; no forma parte del flujo de publicación.
- Los Workers históricos `transparencia-impulsacv` y
  `transparencia-etl-legacy` no existen actualmente en Cloudflare.
- La configuración histórica que permanece en el proyecto maestro está
  documentada como congelada y no tiene referencias en los workflows activos.

## Resultado de la fase 0

La línea base queda establecida con producción como referencia vigente, R2 como
camino público y local como entorno de auditoría/build. No se reemplazan datos
locales por snapshots productivos ni se ejecutan cambios sobre D1. La siguiente
puerta de control es completar la ventana móvil de D1 y confirmar que no
reaparecen lecturas masivas.
