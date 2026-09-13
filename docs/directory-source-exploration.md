# Directorio y explorador de registros

## Directorio de personas

La pestaña `Funcionarios` de `/personas` consulta `/api/funcionarios` sin exigir
seleccionar primero un organismo. La respuesta es paginada y acepta búsqueda por
nombre, cargo u organismo, además de tipo de organismo, contrato, estamento y
ordenamiento. El enlace de descarga exporta sólo la página solicitada.

El navegador nunca descarga el universo completo de funcionarios. En producción,
el Worker consulta primero `funcionarios_publicos` en D1. Si esa tabla no está
disponible o está vacía, usa el índice compacto publicado en R2:

- `projections/funcionarios-v1/manifest.json`
- `projections/funcionarios-v1/versions/<version>/search_index.json`
- páginas de 10.000 filas para navegación sin filtro;
- shards por primera letra de cada término de nombre, cargo u organismo.

El publicador `scripts/publish-cplt-projections.mjs` genera el índice a partir de
las proyecciones oficiales existentes. Los JSON originales no se modifican.
Antes de publicar el Worker, aplicar `migrations/0014_directory_indexes.sql` en
la D1 productiva.

## Registros por fuente

`/cruces` mantiene las relaciones documentales separadas y añade el componente
`CrucesSourceRecords`. Permite consultar por página ChileCompra, InfoLobby,
Contraloría e InfoProbidad, con filtros de texto, ID de entidad, tipo y rango de
fechas. Cada página usa `/api/v1/records`; no se carga la tabla completa en el
navegador.

## Footer

El footer contiene iconos accesibles para las cuatro cuentas oficiales:

- TikTok: `https://www.tiktok.com/@cambiometro`
- Instagram: `https://www.instagram.com/cambiometro/`
- X: `https://x.com/cambiometro`
- Facebook: `https://www.facebook.com/profile.php?id=61593925561451`

## Verificación local

`npm test` valida tipos, Worker, arquitectura, guards y tests unitarios. Para
probar las páginas visualmente, ejecutar Next y el Worker por separado; Next por
sí solo no monta las rutas `/api/*` porque esas rutas pertenecen al Worker.

`npm run pages:build` debe ejecutarse después de hidratar los releases estáticos
requeridos desde R2. Si falta gastos operacionales, el build se detiene con
`STATIC_EXPENSE_RELEASE_EMPTY`; no se debe crear un archivo ficticio para pasar
la guardia.
