# Materialización D1 cerrada por defecto

La publicación pública usa R2/Pages. D1 sólo puede materializarse en una operación interna aprobada y requiere simultáneamente:

```text
D1_ALLOW_REMOTE_MATERIALIZATION=true
D1_MATERIALIZATION_CONFIRMATION=CAMBIOMETRO_D1_RETAINED
```

Sin ambas variables, `data:materialize:optional` termina sin ejecutar Wrangler y deja una advertencia en el resumen de GitHub Actions. El cargador directo de transferencias falla antes de consultar la fuente remota. Los `--dry-run` siguen disponibles para validaciones locales sin escribir D1.

Esta política evita que una ejecución programada de ETL vuelva a consumir la cuota compartida por accidente. No cambia las rutas públicas ni el origen R2 del sitio.
