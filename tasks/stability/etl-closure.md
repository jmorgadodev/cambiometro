# Cierre individual de ETL

Actualizado: 2026-10-03. Inventario preliminar obtenido del
[`etl-calendar.json`](../../.github/etl-calendar.json). El calendario prueba
intención de ejecución, **no** procedencia efectiva ni funcionamiento. Los
endpoints, documentos y destinos R2 se registrarán desde cada conector y su
última ejecución comprobada; no se completan por el nombre de la fuente.

Un ETL tiene cuatro puertas (25 % cada una):

1. Fuente efectiva: URL/API/documento, organismo, modalidad, ventana,
   identidad y restricciones verificadas en código y respuesta real.
2. Replay acotado: conteo y checksum, cero/no-op/caída externa/candidato
   parcial; estimación de operaciones y bytes bajo el margen gratuito.
3. Publicación: release anterior y nuevo, índices, checksum y conteos
   concordantes entre R2, API y página, con rollback disponible.
4. Operación: ejecución programada, manual o local según corresponda,
   smoke productivo y uso facturable de R2 verificado en $0.

No se marca una puerta sólo por un workflow verde. Cada cierre se documenta
con fecha, ejecución, release y prueba en [evidence.md](evidence.md). Si un
origen está bloqueado, conservar el último release válido y marcar
`degraded_external`; no convertir cero filas en corte nuevo. Un conector
manual o local-only puede quedar sano en su modalidad, pero nunca se anuncia
como automático.

| ETL / workflow | Modalidad según calendario | Fuente efectiva y destino R2 | Cierre |
| --- | --- | --- | ---: |
| Cámara · `etl-daily.yml` | Diario | Por verificar | 0/4 |
| Votaciones Cámara · `etl-camara-votaciones.yml` | Diario | Por verificar | 0/4 |
| Personal de apoyo Cámara · `etl-personal-apoyo.yml` | Semanal; origen bloqueado | `camara.cl/diputados/detalle/personaldepoyo.aspx`; `degraded_external`; R2 `projections/personal-apoyo-v1/`; conserva 1.084 filas | 1/4 (25 %); bloqueo externo |
| Personal de apoyo Senado · `etl-personal-apoyo-senado.yml` | Semanal activo; ejecución manual completa verificada | `web-back.senado.cl/api/transparency/senator-assignments/support-staff`; 3.407 filas, enero–agosto 2026; R2 `projections/personal-apoyo-v1/` | 4/4 (100 % del ciclo 2026; cuota confirmada por usuario, ver evidencia) |
| Movimientos · `etl-movimientos.yml` | Diario | Por verificar | 0/4 |
| ChileCompra · `etl-chilecompra.yml` | Semanal; cierre al final | Por verificar | 0/4 |
| InfoLobby · `etl-infolobby-scheduled.yml` | Semanal | Por verificar | 0/4 |
| Contraloría · `etl-contraloria.yml` | Mensual | Por verificar | 0/4 |
| CPLT · `etl-cplt.yml` | Mensual, R2-only | PR #709 y check-sources-only 37118857265: cuatro CSV responden por HEAD, sin ingesta/consolidación ni D1 automático; validadores previos nulos, no acredita corte nuevo ni replay masivo | 0/4 del ciclo completo; guarda R2-only 100 % |
| Ley 19.862 · `etl-ley-19862.yml` | Mensual, R2-only | Resumen/subset R2 verificados por bytes/SHA (4.907.481 bytes); PR #707 y verify-only 37108164915 cierran creación/materialización D1, no replay mensual ni manifiesto API externo | 0/4 del ciclo completo; guarda R2-only 100 % |
| InfoProbidad · `etl-infoprobidad.yml` | Mensual, R2-only | Proyección/subset R2 verificados por bytes/SHA (736.930 bytes); PR #705 y verify-only 37106727934 cierran dependencia D1, no replay mensual | 0/4 del ciclo completo; guarda R2-only 100 % |
| DIPRES · `etl-dipres.yml` | Trimestral, R2-only | Proyección/subset R2 verificados por bytes/SHA (1.127.842 bytes); PR #701 y verify-only 37085144507 cierran dependencia D1, no replay presupuestario | 0/4 del ciclo completo; guarda R2-only 100 % |
| SINIM · `etl-sinim.yml` | Semestral, R2-only | Nueve indicadores configurados, 345 municipios exigidos; release R2 verificado por bytes/SHA. PR #699 y verify-only 37062175649 cierran dependencia D1, no replay de origen | 0/4 del ciclo completo; guarda R2-only 100 % |
| Gastos Senado · `etl-expenses.yml` | Mensual; replay incremental comprobado | `web-back.senado.cl/api/transparency/expenses/senator-Operational-expenses`; 174 períodos publicados, 154.132 filas históricas; índice R2 conservado y API mensual comprobada | 4/4 del ciclo publicado; cuota confirmada por usuario, no facturación medida automáticamente |
| Remuneraciones 38 bis · `etl-remuneraciones-38bis.yml` | Mensual, día 5 a las 10:15 UTC; ejecución remota 37086353257 recuperada | CSV oficial/R2 concordantes; julio 2026, 1.595 filas, 18 históricos; no-op real sin PUT/Pages. Fallo previo preservado como evidencia, no estado actual | 4/4 (100 % del ciclo probado); cuota confirmada por usuario, observación O15 pendiente |
| SERVEL · `etl-servel.yml` | Manual | Por verificar | 0/4 |
| Cámara histórica · `etl-camara-reconciliation.yml` | Manual | Por verificar | 0/4 |
| Nóminas centrales CPLT · `etl-cplt-central.yml` | Manual | Por verificar | 0/4 |
| Votaciones Senado | Local-only; sin workflow remoto | Por verificar | 0/4 |

Orden inicial: terminar O05 antes de cualquier carga; luego documentar
procedencia de los ETL pequeños y sanos, cerrar Movimientos como piloto,
seguir gastos y remuneraciones por componente, y dejar ChileCompra al final.
La corrección de retroceso de Movimientos (O02) no equivale a cerrar sus cuatro
puertas operativas.

Personal de apoyo: [cierre y bloqueos](../../docs/operations/personal-apoyo-source-guards-20261002.md).
En Senado se aceptó la autorización expresa de Jorge y su confirmación de cuota disponible para la puerta de costes; el almacenamiento sí se midió sobre toda la cuenta. Analytics rechazó el token, por lo que no se presenta la facturación como medida automáticamente. La observación de siete días sigue perteneciendo a O15.
