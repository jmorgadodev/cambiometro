# CPLT — prefijo municipal con punto — 20-10-2026

## Referencia y alcance

Worktree `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`; rama `codex/cplt-municipal-scope-20261020`, desde main `c68f0ef6`. Se preserva el snapshot local de votos, excluido del cambio. El recibo posterior de #811 se incorporó sólo documentalmente (`2da24305`). No repetir la guarda de frescura ni los seis cotejos municipales cerrados.

Se investigaron únicamente Penco, Negrete y Macul. Diagnóstico y corrección del clasificador; **no es una recuperación productiva ni una auditoría nacional**.

## Origen y evidencia

- Navegación normal desde el [Portal de Transparencia](https://www.portaltransparencia.cl/PortalPdT/) → Datos e informes → catálogo oficial. [Transparencia Activa](https://opendata.portaltransparencia.cl/dataset/transparencia-activa-publicada-en-el-portal) sigue enlazando `https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContrata.csv`; no se encontró allí un sustituto del enlace con 404 ya comprobado. La ficha anuncia reorganización del conjunto; eso no demuestra por qué Contrata responde 404.
- [Directorio oficial](https://opendata.portaltransparencia.cl/dataset/organismos), recurso `Organismos_360.csv`: HTTP 200, 534.725 bytes, SHA-256 `00a2e3885403dca7ee9f17faca7377edcf6abb819946068639ea993d0f4538f5`, observado `2026-10-20T11:47:16.141Z`. Identifica Macul `MU161`, Negrete `MU181` y Penco `MU210`, con prefijo `I. Municipalidad de`.
- [CSV original Planta](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv): tamaño 8.816.827.431 bytes, ETag `"20d861c27-65e1b0c6f1b80"`. Se exigieron 206, Content-Range/longitud exactos e If-Match/ETag estable; nunca se descargó completo. Se localizaron ventanas positivas por código, sin usar una búsqueda negativa como prueba de ausencia.
- Lecturas CSV de esta intervención: 83 solicitudes / **1.024.000 bytes**. Incluyen cuatro sondas iniciales cuya lectura de campos se corrigió antes de extraer conclusiones, localización y comprobación tras el arreglo. Los lotes tuvieron topes previos; el último, 4 solicitudes / 204.800 bytes. Sin D1, lecturas/escrituras R2, nuevas copias ni publicación. El tráfico HTML del navegador no está incluido en el contador CSV.

## Reproducción y comprobación real

Las ventanas siguientes tienen 65.536 bytes cada una. Se descartan las líneas parciales de ambos extremos y se seleccionan únicamente código exacto, año 2026 y mes Septiembre. **Son muestras, no totales del municipio ni del mes.** Verificación final: `2026-10-20T11:52:20.975Z`.

| Organismo y código | Offset inicial | SHA-256 de ventana | Filas septiembre observadas | Municipal antes → después / parser | Central después |
| --- | ---: | --- | ---: | --- | ---: |
| I. Municipalidad de Macul / MU161 | 6247742730 | `2a5bcae8b8ca87ffc84d446f6a19d92156510539190025966416c574d6d229a8` | 144 | 0 → 144 / 144 | 0 |
| I. Municipalidad de Negrete / MU181 | 6493253375 | `b59531776479f3e15f28f38eae4a124588dad42b20f81ddbb39eea9faea9a4a6` | 142 | 0 → 142 / 142 | 0 |
| I. Municipalidad de Penco / MU210 | 6914921675 | `c18cbda4f56ad15c66c26cdb3df8da940f783fa5e6363401a5f4ea3f55f32ec1` | 130 | 0 → 130 / 130 | 0 |

El clasificador rechazaba `I. Municipalidad…` porque sólo admitía `I Municipalidad…` sin punto. El registro canónico sí resuelve esos nombres a `muni-macul`, `muni-negrete` y `muni-penco`; el rechazo previo impedía llegar a él. El predicado central, inverso del municipal, también clasificaba incorrectamente esos nombres. No se afirma que el release central actual contenga esas filas: no se recorrió.

El original leído es la versión del 18-10, **no el original del release 15-10**. Demuestra un defecto real y su efecto en filas recientes, pero no acredita por sí solo todos los conteos o la causa exclusiva de las ausencias del release anterior.

## Cambio y validación

- Una sola expresión en `scripts/etl/cplt-scope.mjs`: admitir el punto opcional tras `I`, manteniendo las demás reglas. Sin refactor ni cambio de fuente, calendario o límite.
- Tres regresiones con nombres oficiales, resolución del catálogo y aislamiento municipal/central en extracción y filtro de publicación.
- El archivo existente `cplt-scope.test.mjs` estaba fuera del allowlist de Vitest; por eso su caso previo de Maipú no protegía CI. Se incorpora ese archivo, sin habilitar suites ajenas.
- RED: cuatro pruebas fallaron antes del arreglo (tres nuevas y el caso previo de Maipú). GREEN: 22 pruebas, cuatro archivos focales; ESLint sin errores. Comprobación real de las 416 filas muestrales: todas aceptadas y parseadas municipalmente, ninguna aceptada por el scope central.
- Pendiente: revisión independiente y CI/integración del cambio. No ejecutar una ingesta como prueba.

## Continuación exacta

Una vez integrado, no reabrir el diagnóstico del prefijo sin regresión. Para recuperar datos productivos falta Contrata oficial accesible y un candidato completo validado con coste cero; no promover sólo tres categorías ni copiar filas históricas bajo un corte nuevo. Después exigir presencia de los tres municipios, períodos, conteos y smoke API/ficha. Hasta entonces, la recuperación de esas fichas **permanece abierta** y el release anterior se conserva.
