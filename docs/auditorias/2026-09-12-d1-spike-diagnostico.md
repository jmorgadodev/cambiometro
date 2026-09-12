# Diagnóstico del consumo D1 compartido

**Fecha del diagnóstico:** 2026-09-12
**Estado:** consumo crítico identificado; atribución externa pendiente

## Evidencia de Analytics

El workflow `Watch GitHub Actions Usage & Billing` terminó correctamente en el
run `34676396813` a las **05:45 UTC**. Su artefacto reportó:

| Base | Filas leídas | Consultas | Filas escritas | Escrituras |
|---|---:|---:|---:|---:|
| `transparencia-db` | 14.030.061 | 648 | 0 | 0 |
| `impulsacv-db` | 577 | 11 | 18 | 5 |
| **Cuenta** | **14.030.638** | — | **18** | — |

El límite gratuito diario de lectura es 5.000.000. El nivel informado fue
`critical` (**280,61%**). El artefacto previo del run `34661075414` no contenía
filas por base y no se considera evidencia de consumo cero.

El workflow `D1 post-reset probe`, run `34673322107` a las **04:33 UTC**,
ya registraba 13.758.232 filas leídas y 645 consultas sobre
`transparencia-db`. Su compuerta detuvo la petición de Cámara porque la cuota
seguía crítica.

## Descartes dentro de Cambiómetro

Durante la ventana del aumento:

- el ETL de gastos del Senado ejecutó el preflight con
  `D1_ANALYTICS_UNAUTHORIZED`, `proceed=false` y materialización pospuesta;
- el workflow semanal de InfoLobby sólo ejecutó su validación y no materializó;
- la API productiva declara `publicDataBackend: r2` y
  `publicD1Reads: false`;
- la consulta acotada de Cámara respondió HTTP 200 con `sourceBackend: r2-lake`.

Por lo tanto, la evidencia disponible no atribuye esas 648 consultas al
camino público actual de Cambiómetro. Analytics de D1 entrega agregación por
base, no el Worker, ruta, proyecto ni texto de la consulta que originó cada
lectura.

## Protección aplicada

El commit `7976064` exige `github.event_name == 'workflow_dispatch'` en toda
materialización D1 de los ETL. Los procesos programados siguen publicando R2
y no pueden activar D1 aunque el preflight cambiara de estado.

La protección está en la rama local candidata y aún no está desplegada.

## Bloqueo de atribución

El token local de auditoría no tiene permiso de lectura de Workers: la consulta
al inventario de scripts de Cloudflare respondió `403`. Para determinar si el
consumo proviene de otro proyecto o de un Worker antiguo que aún conserva el
binding a `transparencia-db`, se necesita revisar los bindings de Workers con
un token que incluya **Workers Scripts → Read**. No se ejecutó SQL ni se
modificó ninguna base.
