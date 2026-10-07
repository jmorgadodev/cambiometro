# Información defendible y Confianza Chile 2026

Encargo aprobado el 2026-10-07. Este registro amplía el tablero operativo;
no borra cierres ni convierte porcentajes de tareas en exactitud de datos.

## Referencia de trabajo y publicación

- Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
- Aplicación: `transparencia-app`; rama: `codex/confianza-evidencia-20261007`.
- Base obtenida de `origin/main`: `4cd5cf3e891dfbf3e12a4c63e3c72833b5b70f8e`.
- Aplicación publicada: `ef580bbf9832e7ea59a63229c8cbbd5b0057c111`;
  promoción `37567311188`, success (Actions consultado 2026-10-07).
- Deployment: https://d81c86ed.cambiometro.pages.dev.
- Rollback previo documentado: https://314114bc.cambiometro.pages.dev.
- GET ReleaseSet del deployment: HTTP 200, 95.598 bytes, SHA-256
  `619765926f22de4569ec94fba5481bb1245e9b1a07ebcf5bdd2e06d2e46c54c6`.
- Checksum de manifiesto declarado:
  `ff21950f8632f8662f03a8521b5626a9d63585ee70eb7eac8afce65d4efef202`.

Varios snapshots Git difieren del ReleaseSet. No prueba corrupción productiva:
impide certificar producción mediante fixtures. No sustituir los releases.
El artefacto no reemplaza un smoke vigente del dominio personalizado.

## Decisiones

1. Páginas/rutas visibles con avisos concretos junto a cifras.
2. Número incorrecto o sin respaldo suficiente: **En revisión**, sin conservar
   el número bajo una advertencia.
3. Estados: respaldado para el alcance declarado, cobertura limitada, en revisión.
4. Anuncios documentados cuentan; confirmación legal separada y sin duplicación.
5. Sin ingestas, D1, escrituras/borrados R2, backups nuevos o investigaciones públicas.
6. Preservar originales editoriales y registrar correcciones aparte.
7. Consulta de elegibilidad en borrador, sin envío ni postulación automática.

## Hitos

| ID | Peso | Complejidad | Estado |
| --- | ---: | --- | --- |
| C01 Referencia, matriz y consulta | 20 | Baja | 4/4 puertas documentales: 100%; publicación del registro pendiente |
| C02 Parlamento y Movimientos | 25 | Media | 2/4: 50%; hallazgos y retirada probados; cálculo productivo y documentos pendientes |
| C03 Otras páginas y avisos | 25 | Media-alta | 2/4: 50%; inventario/avisos y correcciones locales; preview y resto de indicadores pendientes |
| C04 Cuatro investigaciones preparadas | 15 | Alta | 4/4 casos clasificados: 100% de preparación, ninguno publicable |
| C05 Expediente institucional | 15 | Media | 3/4: 75%; documentos preparados; elegibilidad/adopción/evidencia/firma pendientes |

Registrar evidencia, cambio, pruebas y destino real. Los pesos miden entregables,
no confianza/cobertura ni tiempo. No declarar 100% con publicación o elegibilidad pendientes.

Avance ponderado provisional: **71% de entregables** (71,25% sin redondear).
Las puertas C01 son referencia, reglas, matriz y consulta; C02 son hallazgos,
correcciones con regresión, aritmética del pin y documentos originales; C03 son
inventario/avisos, correcciones, preview y cierre de componentes restantes.
C04 cuenta un expediente de revisión por caso. C05 cuenta mapa institucional,
protocolos propuestos, consulta preparada y cierre con decisiones humanas/RIEA.

## Validación local, antes del preview

- 274 archivos, **1.597 pruebas aprobadas**; tipos frontend/Worker y guardas
  arquitectura, tokens, enlaces e innerHTML con salida 0.
- ESLint del conjunto: salida 0, 139 advertencias; no se afirma cero advertencias.
  ESLint de los últimos archivos modificados: salida 0.
- Regresión: una dieta constante no reemplaza un pago faltante; histórico de
  apoyo no se presenta como mensualidad; referencia genérica no acredita cese.
- La auditoría calcula un máximo de 4 GET/12 MiB. El insumo de votaciones es
  privado al build (404 público); ese resultado no significa datos perdidos.
  El cálculo en CI consume los mismos archivos hidratados y verifica sus SHA,
  sin lecturas R2 adicionales ni consultas D1.
- Preview por `pages-ui-refresh.yml`, `audit_without_d1=true`: no prepara D1
  ni ejecuta el Worker con D1; navegador intercepta todas las solicitudes API.
  Comprueba presentación, avisos, CSP, accesibilidad y móvil/escritorio. **No
  certifica la API ni búsquedas productivas.** Las puertas normales se conservan.
- Este modo reutiliza la hidratación canónica existente de Pages. No ejecuta
  ETL, no altera releases ni hace PUT/DELETE R2. Un fallo bloquea promoción.

Estado actual: código y documentos locales; aún sin preview ni promoción de
este encargo. No confundir los avisos incorporados con una auditoría concluida
de todos los registros ni con una candidatura aprobada.

## Entregables editoriales e institucionales

- `C:\Users\jorge\Proyectos\cambiometro-editorial\social\investigaciones\REVISION_20261007.md`
  y cuatro actas homónimas por caso. Originales intactos; todas las piezas quedan
  NO PUBLICABLES, con versiones neutrales y condiciones específicas de desbloqueo.
- [Expediente institucional](expediente/README.md): borradores, no políticas
  adoptadas ni puntuación acreditada. Consulta preparada, no enviada.

## Hallazgos iniciales comprobados

- Movimientos publicado: SHA `e3e6753b280f2535e080aa444c761ed5ea01b4103803284e6a0a55d8e3a372af`,
  108.691 bytes. 46 filas (10 verificado, 35 corroborado, 1 en confirmación)
  + 5 señales = 51 eventos, 6 pendientes. Estado almacenado no acredita un decreto.
- Seis verificaciones preceden una fuente citada: Evelyn Bintrup, Jorge Heiden,
  Camila Alonso, Patricia Dinamarca, Jorge Salazar y Alexander Nanjarí.
  Revisar esas fechas sin eliminar anuncios ni alterar el release.
- Senado local: arranque reparado; sesiones 10292/10291 rechazadas por asistencia
  incompleta. Último release preservado, no cobertura actual completa.
- INV-001: BCN `idNorma=30230` es Ley 18.854, no 18.883 (consulta 2026-10-07).
- INV-002: edades aproximadas y anualizaciones requieren respaldo específico.
- INV-003: primera tabla omite asesorías incluidas en el total del CSV;
  otros totales no concilian todos los componentes. No publicar el ranking.
- INV-004: corte de 46 distinto del catálogo actual de 51; masa salarial
  no equivale a costo fiscal de la rotación.

## Referencias

- [Matriz por indicador](matriz.md).
- [Consulta de elegibilidad no enviada](consulta-riea.md).
- [Tablero operativo](../stability/todo.md).
- Bases: `C:\Users\jorge\Downloads\Bases_ConfianzaChile_2026.pdf`;
  https://reddeintegridad.cl/confianza-chile.html. Cierre 26-10-2026.
