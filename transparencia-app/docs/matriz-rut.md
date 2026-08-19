# Matriz de manejo de RUT

Matriz por fuente de qué tratamiento recibe el RUT en la plataforma. Regla general: **los RUT de personas naturales nunca se publican, exponen ni serializan en la API o en la búsqueda**; los RUT de personas jurídicas (organismos públicos y proveedores) se conservan como identificador oficial público de la fuente, con enlace de origen.

El test `lib/rut-exposure.test.ts` verifica automáticamente la no-exposición de RUT de personas en la búsqueda, en las fichas y en los identificadores serializados.

## Reglas por fuente

| Fuente | ¿Contiene RUT? | Tratamiento | ¿Se publica? | Notas |
|--------|---------------|-------------|--------------|-------|
| Cámara de Diputadas y Diputados | No | — | No | Se usan `diputado_id` y `camara-dipid` como claves. |
| Senado de Chile | No | — | No | Se usa `senador_id` / `senado-id` como clave. |
| SERVEL (resultados) | No | — | No | Identificadores `servel-*` de candidaturas, nunca RUT. |
| CPLT / Transparencia Activa (funcionarios) | Sí (en nómina original) | Se descarta el RUT en la extracción; nunca se almacena en el contrato público | No | `lib/funcionarios-source.ts` no conserva campos `rut`. |
| ChileCompra (OCDS) | RUT jurídico de organismos y proveedores | Se conserva como `CHILECOMPRA-RUT` con `isPublic: true` y `sourceUrl` | Solo RUT jurídico | Los RUT de compradores/proveedores son públicos en el portal; los atributos de personas (participantes) no se exponen. |
| InfoLobby (ley 20.730) | No en el contrato público | — | No | Claves `infolobby-*` internas. |
| CPLT Declaraciones de interés (ley 20.880) | No en el contrato público | — | No | Claves `cplt-*` internas. |
| Ley 19.862 (transferencias) | RUT jurídico de emisores/receptores | Se conserva como identificador público con enlace | Solo RUT jurídico | Datos públicos del Registro 19.862; receptores son instituciones. |
| DIPRES / SINIM | No | — | No | Presupuesto e indicadores agregados. |

## Invariantes verificadas por test

1. Ninguna entidad `kind: "person"` tiene un identifier con scheme que contenga `rut`, ni atributos cuyo valor coincida con un patrón de RUT chileno (`\d{1,2}(?:\.\d{3}){2}-[0-9kK]`), ni RUT en su `id`.
2. La búsqueda pública (`searchEntities`) no devuelve valores tipo RUT para personas.
3. La ficha de una persona (`getEntity`) no serializa RUT.
4. Las entidades jurídicas (`supplier`) conservan RUT solo como identifier público con `sourceUrl` de la fuente oficial.

## Nota sobre personas jurídicas

Un RUT de persona jurídica de un organismo público (ej. MOP `61.202.000-0`) o de un proveedor es dato público publicado por la propia fuente (ChileCompra, Registro 19.862) y se muestra con su enlace de origen. No constituye un dato personal de persona natural, por lo que su publicación no está afecta a las reglas de no-exposición anteriores.