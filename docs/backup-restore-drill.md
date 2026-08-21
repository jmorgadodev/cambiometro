# Drill de respaldo y restauración — 2026-08-20

> **Objetivo**: Validar que los backups semanales generados por `backup-weekly.yml` pueden
> restaurarse correctamente en un entorno de staging y que los datos son idénticos a la fuente
> original (integridad de punta a punta).

## 1. Flujo de trabajo habitual

1. **Backup semanal** (`workflows/backup-weekly.yml`):
   - Se ejecuta todos los domingos a 01:00 CLT (UTC-3).
   - Exporta D1 (`transparencia-db`) a `d1/<fecha>/transparencia-db.sql.gz` en R2 bucket `cambiometro-backups`.
   - Copia todos los objects del bucket `transparencia-public-data` a `backup/<fecha>/` en el mismo bucket.
   - Retiene 8 semanas; borra backups antiguos.

2. **Primer drill** (ejecutar después de la primera corrida exitosa del backup):
   - Seleccionar el backup más reciente (`backup-weekly.yml` run → artifacts → logs).
   - Ejecutar `scripts/restore-drill.mjs` (o pasos manuales, ver abajo).
   - Verificar que los conteos coinciden con `source_state` de D1 y el catálogo R2.

## 2. Script de restauración (`scripts/restore-drill.mjs`)

```bash
# Ejemplo de uso (después de identificar el backup):
node scripts/restore-drill.mjs --backup d1/2026-08-20/transparencia-db.sql.gz
```

El script hace lo siguiente:
1. **Restaurar D1**: `wrangler d1 restore <backup_path> --remote --env staging`
2. **Verificar D1**: consultar `SELECT count(*) FROM source_state` y comparar con el
   `source_state` original (se recomienda guardar el conteo previo o usar
   `SELECT * FROM source_state WHERE etl_run_id LIKE '%backup%'`);
3. **Restaurar lake R2** (opcional): copiar objects desde `backup/<fecha>/` de vuelta a
   `transparencia-public-data` (solo si se necesite deshacer el backup).
4. **Reporte**: imprimir conteos de D1 y validación rápida (número de partitions,
   sources, entities por source).

> **Nota**: La restauración completa del lake (todos los objetos) puede tardar varias
> horas dependiendo del volumen. El drill se enfoca en D1 + conteos rápidos.

## 3. Pasos manuales alternativos (si no se usa el script)

### 3.1 Restaurar D1 desde la consola

```bash
# Listar backups disponibles
wrangler d1 list-backups --remote  # (si está disponible) o inspeccionar R2

# Restaurar el backup más reciente a staging
wrangler d1 restore cambiarmetro-backups/d1/2026-08-20/transparencia-db.sql.gz \
  --remote --env staging
```

### 3.2 Verificar integridad de D1

```bash
wrangler d1 execute staging --remote --sql="SELECT count(*) as total FROM source_state;"
wrangler d1 execute staging --remote --sql="SELECT source_id, record_count FROM source_state ORDER BY source_id;"
```

### 3.3 Verificar conteos del lake R2

```bash
# Contar partitions y sources en el catálogo vs backup
wrangler r2 object get transparencia-public-data/catalog/v1/manifest.json --remote |
  jq '.partitions | length'   # partitions en catálogo
wrangler r2 object get transparencia-public-data/catalog/v1/manifest.json --remote |
  jq '.sources | length'      # sources registrados
```

## 4. Checklist del drill

- [ ] Backup semanal completado exitosamente (artifacts en GitHub Actions).
- [ ] Se identificó el backup más reciente en `cambiometro-backups`.
- [ ] D1 restaurado a entorno staging sin errores.
- [ ] Conteos `source_state` coinciden con el estado previo al backup.
- [ ] (Opcional) Lake R2 restaurado o validado contra catálogo.
- [ ] Este documento actualizado con los resultados.

## 5. Próximo drill (trimestral)

Programar para el siguiente trimestre (≈ 2026-11-20) y repetir los pasos above.