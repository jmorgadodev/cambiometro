# Cierre individual de ETL

Actualizado: 2026-10-02. Inventario preliminar obtenido del
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
| CPLT · `etl-cplt.yml` | Mensual | Por verificar | 0/4 |
| Ley 19.862 · `etl-ley-19862.yml` | Mensual | Por verificar | 0/4 |
| InfoProbidad · `etl-infoprobidad.yml` | Mensual | Por verificar | 0/4 |
| DIPRES · `etl-dipres.yml` | Trimestral | Por verificar | 0/4 |
| SINIM · `etl-sinim.yml` | Semestral | Por verificar | 0/4 |
| Gastos Senado · `etl-expenses.yml` | Mensual; replay incremental comprobado | `web-back.senado.cl/api/transparency/expenses/senator-Operational-expenses`; 174 períodos publicados, 154.132 filas históricas; índice R2 conservado y API mensual comprobada | 4/4 del ciclo publicado; cuota confirmada por usuario, no facturación medida automáticamente |
| Remuneraciones 38 bis · `etl-remuneraciones-38bis.yml` | Mensual, día 5 a las 10:15 UTC; última repetición con conexión externa fallida | CSV oficial completo comprobado; julio 2026 corregido a 1.595 filas, 18 históricos preservados; R2/API/Pages concordantes; `degraded_external` remoto | 3/4 (75 %); guardas/publicación verificadas, operación remota pendiente |
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
