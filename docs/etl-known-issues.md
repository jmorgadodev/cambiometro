# ETL Known Issues

## camara.cl WAF (agosto 2026)

- Problema: camara.cl bloquea IPs de GitHub Actions (WAF)
- Impacto: ETL de diputados no corre desde GitHub Actions
- Estado: issue abierto, resolver post-launch
- Workaround: ejecutar ETL manualmente desde IP local (npm run etl:camara)
- Datos actuales: corte agosto 2026 (último run exitoso)