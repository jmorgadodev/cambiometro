# Auditoría de espacio local — 12 de septiembre de 2026

## Alcance

Se midieron los archivos dentro de las tres carpetas operativas definidas para
El Cambiómetro. La medición no borra, mueve ni modifica archivos.

| Carpeta | Archivos | Tamaño observado |
|---|---:|---:|
| `cambiometro-public` | 23.096 | 7,56 GB |
| `cambiometro-audit` | 146.640 | 8,28 GB |
| `cambiometro-editorial` | 18.616 | 1,05 GB |
| **Total operativo** | **188.352** | **16,89 GB** |

El cálculo no confirma 43 GB dentro de esas tres carpetas. El resto del espacio
observado en `C:\Users\jorge\Proyectos` pertenece a otros proyectos o a
carpetas auxiliares y no debe eliminarse como parte de esta operación.

## Hallazgos relevantes

En `cambiometro-public` los mayores consumidores son:

- `data/lake/.work/ley19862-full.json`: 79,8 MB;
- `data/lake-cplt/projections/funcionarios-v1/versions/...`: varios snapshots
  históricos, con archivos individuales de hasta 40,6 MB;
- datasets públicos que sí forman parte del proyecto maestro y no deben
  eliminarse sin confirmar su uso en build/rollback.

En `cambiometro-audit` los mayores consumidores son:

- `data/lake/.work/chilecompra-sector-eval/14CompraAgil.csv`: 734,1 MB;
- `data/etl/latest.json`: 470,2 MB;
- `data/lake/projections/v1/infolobby.json`: 129,1 MB;
- `data/entidades-canonica.json`: 103,2 MB;
- dependencias locales `node_modules` y artefactos de trabajo.

En `cambiometro-editorial`, aproximadamente 1,05 GB corresponden a
dependencias/renderizadores locales y assets editoriales. Los videos no deben
formar parte de la operación editorial vigente, pero se conservarán hasta
identificar exactamente cuáles son los assets aprobados y cuáles son
descartables.

## Regla de limpieza segura

1. No borrar snapshots, releases ni archivos de datos del proyecto maestro
   mientras no exista un manifiesto o bundle de rollback equivalente.
2. La primera limpieza candidata son temporales reproducibles bajo
   `data/lake/.work`, cachés y dependencias reinstalables; requiere una lista
   exacta y una confirmación antes de ejecutar eliminación.
3. Los assets editoriales se auditan aparte; no se toca la carpeta
   `social/Publicaciones` ni se mezclan sus borradores con videos descartados.
4. No se crean nuevas carpetas de fases dentro de `Proyectos`.

**Estado:** diagnóstico completado; no se ejecutó limpieza destructiva.
