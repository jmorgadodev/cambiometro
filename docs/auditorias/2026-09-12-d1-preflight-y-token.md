# Preflight D1 y token de auditoría — 12 de septiembre de 2026

## Comprobaciones realizadas

Se utilizaron las credenciales presentes en la sesión local, sin imprimir ni
registrar el token.

| Comprobación | Resultado |
|---|---|
| `wrangler whoami` | Cuenta identificada correctamente |
| Lectura de manifiesto CPLT en R2 | Correcta |
| Verificación del token (`/user/tokens/verify`) | Token activo |
| API REST de D1 | `Authentication error` |
| D1 Analytics GraphQL | `not authorized for that account` |

## Decisión

El token cargado en `CLOUDFLARE_API_TOKEN` permite la lectura de R2, pero no
permite comprobar el consumo D1. No es posible afirmar el porcentaje diario ni
autorizar una materialización mientras esta sesión no tenga permisos válidos
para:

- D1: lectura de la cuenta y bases necesarias para el preflight;
- Account Analytics: lectura de `d1AnalyticsAdaptiveGroups`.

La falta de autorización no demuestra que D1 esté excedida. Sólo demuestra que
el dato de cuota no está disponible con el token actualmente cargado.

## Medidas de seguridad aplicadas

- No se ejecutó SQL remoto.
- No se ejecutó materialización D1.
- No se ejecutó el ETL CPLT.
- No se publicó ni modificó R2.
- El release público vigente permanece intacto.

## Siguiente paso

Actualizar la variable de entorno local con el token de auditoría que tenga
alcance de cuenta para D1 y Account Analytics, comprobar nuevamente REST y
GraphQL y recién después ejecutar el preflight de cuota. El token no debe
escribirse en el repositorio, bitácoras ni mensajes.

**Estado:** preflight bloqueado por autorización del token; fases de auditoría
que sólo leen Pages/R2 pueden continuar.
