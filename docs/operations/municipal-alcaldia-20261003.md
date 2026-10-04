# Incidente: alcaldía histórica presentada como vigente

## Ruta y alcance

Worktree canónico: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/municipal-authority-cut-20261003`; base `619dc1d1`.
Se corrige únicamente selección/presentación de alcaldías y se investiga el
importe de Tortel. No se modifican otros ETL, originales ni remuneraciones.

## Causa y comprobación

El constructor usaba `rawStaff.find(...)`, seleccionando la primera fila
histórica con estamento/cargo compatible y sueldo positivo. No comprobaba el
corte reciente ni las ambigüedades. Los checks de checksum, URL y monto positivo
no acreditaban titularidad vigente; no deben comunicarse como validación semántica.

El agregado productivo auditado tiene 346 comunas, checksum
`e32d47583976b250335907452ee77b7547474a97f1ae421687e2f32d190ebfd5`.
Resultados reproducibles en `municipal-alcaldia-evidence-20261003.json`:

- 318 tenían una fila de alcaldía seleccionada.
- 156 seleccionaban un período anterior al último corte publicado (45,1% de 346).
- 68 de esas 156 tienen evidencia de alcaldía más reciente en el top publicado;
  60 muestran otro nombre. Esto no certifica automáticamente un cambio legal.
- 17 tarjetas tienen bruto positivo menor a $1 millón; todas corresponden a
  cortes antiguos. El umbral identifica casos de revisión, no prueba errores.
- El top de cinco remuneraciones es parcial: no permite contar todas las
  alcaldías ni descartar homónimos/subrogancias omitidos de ese top.

Tortel: el CSV oficial de planta, organismo `MU326`, página `61143682`,
enero 2025, informa a Abel Becerra Vidal con bruto `468212,0`, líquido `410021,0`,
ingreso `2021/06/28`, término `Indefinido`, observaciones `Sin observaciones`.
El parser produce exactamente $468.212 y $410.021: no hay transformación del
importe en este caso. Noviembre 2024 informa $7.426.023 y diciembre $3.464.016.
No hay explicación documental de la reducción: no atribuirla a ajuste, días
trabajados, finiquito ni error de origen sin evidencia adicional.

La alcaldesa identificada por https://www.tortel.cl/alcaldesa/ es Marisela
Jiménez Cruces. La proyección productiva contiene su fila de agosto 2026,
bruto $8.120.877 y líquido $6.715.597. La evidencia del CSV original queda en
`tortel-payroll-source-evidence-20261003.json` cuando se ejecuta el cotejo.

## Corrección

- Selector único compartido por constructor y capa de lectura.
- Sólo cargo exacto de alcaldía y último período publicado; no estamento solo.
- No elegir subrogancias, suplencias, dos filas distintas o contratos terminados.
- No deduplicar por nombre; sólo filas exactamente iguales.
- No filtrar identidad por sueldo, ni convertir cero/nulo entre sí.
- Nuevos agregados conservan `alcaldia_registros` con originales históricos de
  alcaldía, fechas, observaciones y procedencia. El corte seleccionado no borra
  esas filas ni la nómina original.
- Para agregados anteriores se usa la evidencia disponible del top del corte;
  la interfaz la identifica como **alcaldía en nómina**, no certificación de
  máxima autoridad vigente. Sin evidencia reciente suficiente, no se arrastra
  el sueldo antiguo.
- No asignar por defecto partido Independiente ni grado 1 cuando no están informados.
- El directorio y sus búsquedas usan la misma alcaldía del corte que la ficha;
  no reutilizan el nombre antiguo del índice resumido. El estamento original
  (por ejemplo, Directivo) se conserva sin sustituirlo por una categoría inventada.

## Reproducción y límites

Desde `transparencia-app/`:

```powershell
node --experimental-strip-types scripts/audit-municipal-alcaldia.mjs --report ../docs/operations/municipal-alcaldia-evidence-20261003.json
node scripts/audit-tortel-payroll-source.mjs --report ../docs/operations/tortel-payroll-source-evidence-20261003.json
npx vitest run lib/municipal-alcaldia.test.ts lib/municipalidad-enriquecida.test.ts lib/municipalidades-redesign.test.ts
```

El primer comando lee un solo agregado R2 de 61.788.251 bytes, comprueba tamaño
y checksum y para si excede 65 MB. El segundo requiere HTTP 206/ETag estable,
usa rangos acotados y corta antes de 6 MB/40 solicitudes; no ingiere el CSV de
8,71 GB. No hay consultas D1 ni escrituras/borrados R2.

## Validación y estado

Reproducción antes del arreglo: 7 pruebas fallaban por selección histórica,
ambigüedad y períodos inválidos. Tras corregir: 48 pruebas focalizadas y
1.549 pruebas totales aprobadas; tipos de interfaz/Worker, arquitectura, tokens,
enlaces e innerHTML aprobados. Lint focalizado: cero errores, 13 advertencias
preexistentes; no se tocaron asuntos ajenos. La comparación distingue último
corte publicado de corte representativo de dotación. El fixture de Santiago
separa identidad oficial acreditada de remuneración observada; no exige
reutilizar una fila anterior para pasar una prueba.

Navegador local comprobado en `/municipalidades/tortel/`: escritorio 1440 px
y móvil 390 px, sin errores JavaScript ni desborde horizontal; la tarjeta no
muestra a Abel como autoridad del corte reciente. Se utilizó el snapshot local
de julio para renderizado, no para sustituir el corte productivo de agosto.
La URL legacy `muni-tortel` necesita la redirección del export y no funciona
directamente en `next dev`; la ruta canónica sí. No se cambiaron rutas.

Pendiente de registrar: CI/build completo, merge/despliegue y smoke productivo.
El primer E2E detectó una expectativa con el rótulo antiguo de remuneración;
se actualizó al nuevo rótulo de alcance, sin omitir la comprobación de la tarjeta.
No declarar publicado por pasar pruebas locales.
La causa económica del importe de Abel sigue **no explicada por la fuente**;
requiere aclaración/documento de Municipalidad de Tortel, no una corrección inventada.
Rollback: revertir el commit de esta corrección y desplegar con el mismo
ReleaseSet. Nunca revertir releases de datos ni borrar históricos por este cambio.
