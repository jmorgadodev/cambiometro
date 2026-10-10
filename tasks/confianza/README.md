# Información defendible y Confianza Chile 2026

Encargo aprobado el 2026-10-07. Este registro amplía el tablero operativo;
no borra cierres ni convierte porcentajes de tareas en exactitud de datos.

### Actualización productiva — cobertura territorial — 2026-10-10

Se corrigió en Home una afirmación que sobregeneralizaba el catálogo territorial:
ahora indica 346 comunas y 16 gobiernos regionales, y aclara que los indicadores
dependen del período y alcance de cada fuente. La etiqueta es “Comunas
catalogadas”; no se afirma que el catálogo equivalga a cobertura completa de
municipalidades o servicios. PR #729, merge
`3bec57aa1fb0272b3cd0d7f2fc436e14f2bf9627`; build principal `38025565165`,
preview inspeccionado `https://b28f26dd.cambiometro.pages.dev`; promoción exacta
del artefacto `38026734219`, success. Producción:
https://dd400a24.cambiometro.pages.dev, deployment ID
`dd400a24-bbc5-4775-9455-2a95b9c85d6f`; rollback exacto:
`npm run pages:rollback -- dd400a24-bbc5-4775-9455-2a95b9c85d6f`.

Smoke del dominio personalizado tras promoción: texto territorial y etiqueta
actualizados; 51 movimientos, 10 días tras hidratación desde el cambio efectivo
del 14-09, revisión publicada 01-10 y votaciones hasta el 07-10. La última
comprobación acredita la interfaz/corte que muestra Home, no exhaustividad del
catálogo ni cobertura nacional de indicadores. La promoción hidrata el
ReleaseSet existente; no ejecuta ETL ni escribe R2 o D1 remoto.

### Estado productivo verificado — 2026-10-10

La referencia histórica del 08-10 y las notas del 07-10 quedan superadas por
la promoción del artefacto de `origin/main` `1ba6d0f73a24b14bd38d0f76c3eb3c40433484bb`.
El PR #719 está fusionado en main; no se usó su rama para publicar. Promoción
Pages `38024190903`, exitosa; deployment
https://352058de.cambiometro.pages.dev, ID
`352058de-4ae9-4599-add0-ee8c8b8c2455` (rollback exacto disponible con ese ID).
ReleaseSet `5e9844cbc35d39c4bfd9f428e1e55a25ec912a8f417b2d601f91307e5de25c37`.

Smoke en dominio personalizado el 10-10: Home muestra 51 movimientos
(46 registros oficiales más 5 señales), última señal 30-09, último cambio
efectivo 14-09 y revisión publicada 01-10. El contador dinámico se ve como 00
en HTML inicial y pasa a 10 días tras la hidratación del navegador; no interpretar
el HTML previo a hidratación como valor final. Votaciones: 1.037 registros,
última incorporada 07-10; página 1 del listado anual comienza el 07-10 y continúa
con 06-10. Esta comprobación acredita el corte publicado, no cobertura completa
de todas las sesiones ni integridad nominal universal.

El build hidrató el ReleaseSet vigente sin escrituras R2 ni consultas D1.
Evidencia CI: `38023333469`; promoción/verificación: `38024190903`.

## Referencia de trabajo y publicación

### Actualización puntual del 08-10-2026 — histórica, superada por el estado del 10-10

Se interrumpió C03 para resolver el personal de apoyo de septiembre autorizado
por Jorge. PR #720/#721 fusionados: main
`7ca4ca9e8189624a29fb2b9e671eb732a1985163`. Producción conserva código de
interfaz `34b7507435e039ebc0ffd10dd10a66695bf1693c`, deployment
https://cfd4b9e5.cambiometro.pages.dev. #721 sólo corrige la comparación del ETL;
no necesita sustituir el frontend. Rollback https://956f43f6.cambiometro.pages.dev.
ReleaseSet público SHA
`eba173d94caf86aa2947c34fc7ff3e4a500cc6d097f2b124c585b5c4d1843dd2`;
personal de apoyo SHA
`e59e787a7bf4d1149061fbc47591a0ab5254962425b6055aa48daa8fe2b4072d`.

Septiembre Senado: 420 filas comprobadas contra el endpoint oficial; Cámara
conservada, no recuperada. Revisión diaria; replay `37770276372` sin PUT/build
Pages. [Acta operativa](../../docs/operations/senado-apoyo-refresh-20261008.md).
[Continuación documental C03](personal-apoyo-septiembre-20261008.md).
Rama de este expediente alineada con main sin sobrescribir el checkout principal
ni borrar archivos locales. En ese corte, PR #719 seguía como borrador y sus
cambios de confianza no estaban en producción. El PR se fusionó posteriormente;
el estado productivo vigente está registrado arriba.

### Referencia inicial del 07-10-2026 — histórica

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
5. Sin ingestas, D1 de Cloudflare, escrituras/borrados R2, backups nuevos o investigaciones públicas.
   Excepción autorizada expresamente por Jorge: D1 local efímera del CI de integración,
   sin acceso remoto ni consumo facturable D1. No autoriza materialización productiva.
6. Preservar originales editoriales y registrar correcciones aparte.
7. Consulta de elegibilidad en borrador, sin envío ni postulación automática.

## Hitos

| ID | Peso | Complejidad | Estado |
| --- | ---: | --- | --- |
| C01 Referencia, matriz y consulta | 20 | Baja | 4/4 puertas documentales: 100%; registro en PR borrador, no adoptado institucionalmente |
| C02 Parlamento y Movimientos | 25 | Media | 3/4: 75%; hallazgos, retirada y aritmética productiva; prueba focalizada confirma que el nominal discordante 11349 queda En revisión; documentos/actas y afiliación temporal pendientes |
| C03 Otras páginas y avisos | 25 | Media-alta | 3/4: 75%; inventario/avisos, correcciones y preview 96/96; comprobación de indicadores restantes pendiente |
| C04 Cuatro investigaciones preparadas | 15 | Alta | 4/4 casos clasificados: 100% de preparación, ninguno publicable |
| C05 Expediente institucional | 15 | Media | 3/4: 75%; documentos preparados; elegibilidad/adopción/evidencia/firma pendientes |

Registrar evidencia, cambio, pruebas y destino real. Los pesos miden entregables,
no confianza/cobertura ni tiempo. No declarar 100% con publicación o elegibilidad pendientes.

Avance ponderado vigente: **83% de entregables** (83,75% sin redondear; conservador).
Las puertas C01 son referencia, reglas, matriz y consulta; C02 son hallazgos,
correcciones con regresión, aritmética del pin y documentos originales; C03 son
inventario/avisos, correcciones, preview y cierre de componentes restantes.
C04 cuenta un expediente de revisión por caso. C05 cuenta mapa institucional,
protocolos propuestos, consulta preparada y cierre con decisiones humanas/RIEA.

## Validación local, antes del preview

### Referencia más reciente de código

Corrección de gastos: `87acf41826207dbffac6e01e4c26e94318abfcae`.
Suite local: **278 archivos / 1.620 pruebas**, salida 0. Preview canónico
`37668737784`, success: https://5df196d2.cambiometro.pages.dev. Pasaron
96 controles del candidato y ocho adicionales de gastos/ficha publicados;
ReleaseSet igual al pin. Quality/integración aprobados. No es una promoción productiva. El acta
[gastos-presentacion-20261007.md](gastos-presentacion-20261007.md) separa
las correcciones probadas de la conciliación documental todavía pendiente.
Los resultados anteriores que siguen se conservan como historial, no como
referencia del código más reciente.

### Validaciones anteriores

- 276 archivos, **1.605 pruebas aprobadas** después de las correcciones de Datos y filtros móviles; tipos frontend/Worker y guardas
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

Estado actual: rama publicada y preview validado, sin promoción productiva de
este encargo. Commit probado: `41b391458b7cd734689c65193c37fa5ad4b1b399`.
Preview: https://61e4f67e.cambiometro.pages.dev.
Actions: https://github.com/jmorgadodev/cambiometro/actions/runs/37652611168.
Pasaron 96/96 controles (24 rutas, dos tamaños y dos temas), sin llamadas API.
Cuatro comprobaciones adicionales del preview publicado verificaron Home y
Movimientos en móvil/escritorio y coincidencia del ReleaseSet con el artefacto.
No confundir esos resultados con certificación de búsquedas, documentos originales
o candidatura. Tras la autorización explícita de D1 local, el control requerido
de integración se reejecutó sobre `b44cc0c3`: run `37654539770`, intento 2,
terminado con `success`.
Build, fixture local, rutas/API/widget, temas y seguridad aprobaron sus pasos.
No se cambió el código probado ni se activó D1 remota. La fixture comprueba
contratos de integración, no la cobertura o verdad de los datos productivos.

## Historial de intentos anteriores — superado por el preview citado

Actualización de evidencia: rama publicada, commit inicial `531836b8`,
PR https://github.com/jmorgadodev/cambiometro/pull/719 (borrador).
Primer build canónico compiló; smoke falló en nombres accesibles de filtros,
sin publicación. [Hallazgo nominal](hallazgo-votos.md): 152 sesiones con
discordancia entre nominales y totales, retiradas en presentación sin inventar
su opción. La muestra Cámara reproduce la contradicción en el XML original.
Las correcciones siguientes requieren un nuevo preview; producción no cambió.
El run `37639712187` compiló el pin, pero el navegador rechazó enlaces de
votaciones sin `noopener`; corregidos con regresión específica. No se relajó
la puerta del preview ni se publicó el artefacto fallido. La guarda estática
exige ahora ambos atributos, igual que el navegador; se completaron únicamente
esos atributos en los enlaces existentes que no cumplían la regla.

Desviación documentada: el CI automático de PR `37639724535` terminó antes
de poder cancelarlo y preparó una **D1 local efímera de pruebas**. No consultó
ni modificó D1 productiva; aun así incumple el límite de no materialización
de esta revisión. Sus resultados no cuentan como evidencia «sin D1».
La validación canónica de este encargo usa `audit_without_d1=true`; los CI
automáticos siguientes se cancelaron antes de preparar fixtures D1. Esa
restricción fue reemplazada posteriormente por la autorización expresa de
D1 local efímera; no se cancelan los nuevos controles por ese motivo.
El siguiente CI automático `37641823177` quedó cancelado con su fixture D1
omitido. El run canónico `37641788118` rechazó desborde en `/datos`; 20 rutas
pasaron en escritorio claro antes de ese bloqueo. Corregidos el ajuste y las
promesas de cobertura completa/auditoría universal. El total entre fuentes
queda En revisión; no se suman unidades distintas ni se inventa la causa de
una diferencia. La siguiente ejecución recopila todos los fallos y mantiene
el bloqueo si uno solo persiste, para evitar repetir builds por cada ruta.
Su pin cambió por actualizaciones ajenas a este encargo: ReleaseSet
`2eb2ba1a20f8245a20afd917cdc518b9b816b58016e274d6d2a48f5b1a8bc0f8`,
1.024 sesiones (711 Cámara / 313 Senado); no sustituye la evidencia del pin
inicial de 1.009 sesiones ni implica que hayamos cargado datos.
La aritmética productiva de C02 ya se comprobó (3/4 puertas, 75%); faltan los
documentos nominales/actas y la afiliación temporal. El avance de este intento
era 77% (77,5% sin redondear), superado por el estado vigente de arriba.

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
  [Revisión documental 6/6](movimientos-documentos-20261007.md): fechas
  cuestionadas retiradas en presentación; no equivale a seis ceses legalmente
  confirmados. Anuncios y release original conservados. Render local 24/24;
  preview nuevo `af973bc0` validado: 96/96 generales y 24/24 específicos,
  integración y 1.614 pruebas verdes. Avance global sin cambio (83%).
- Senado local: arranque reparado; sesiones 10292/10291 rechazadas por asistencia
  incompleta. Último release preservado, no cobertura actual completa.
- INV-001: BCN `idNorma=30230` es Ley 18.854, no 18.883 (consulta 2026-10-07).
- INV-002: edades aproximadas y anualizaciones requieren respaldo específico.
- INV-003: primera tabla omite asesorías incluidas en el total del CSV;
  otros totales no concilian todos los componentes. No publicar el ranking.
- INV-004: corte de 46 distinto del catálogo actual de 51; masa salarial
  no equivale a costo fiscal de la rotación.

## Referencias

- [Gastos: períodos e indicador retirado](gastos-presentacion-20261007.md):
  regresiones y preview comprobados; conciliación de originales pendiente.

- [Matriz por indicador](matriz.md).
- [Decisión por las 31 rutas existentes](estado-por-ruta.md).
- [Entrega y bloqueo de publicación](entrega-20261007.md).
- [Consulta de elegibilidad no enviada](consulta-riea.md).
- [Tablero operativo](../stability/todo.md).
- Bases: `C:\Users\jorge\Downloads\Bases_ConfianzaChile_2026.pdf`;
  https://reddeintegridad.cl/confianza-chile.html. Cierre 26-10-2026.
