# ETL local de Personal de Apoyo de Cámara

## Motivo y alcance

GitHub-hosted recibe HTTP 403 al consultar las fichas de `camara.cl`. El corte de Cámara se ejecuta desde la red local autorizada. El workflow remoto conserva sólo la opción manual de verificar el release vigente; el calendario de extracción es una tarea local semanal.

## Ejecución

- Tarea de Windows: `Cambiometro - ETL Personal de Apoyo Cámara local`.
- Calendario: lunes 09:30, con `StartWhenAvailable` y sin instancias concurrentes.
- Comando manual: `npm run etl:personal-apoyo-camara:local` desde `transparencia-app/`.
- Instalación: `npm run etl:personal-apoyo-camara:install-task`.
- Log local: `%USERPROFILE%\.cambiometro\personal-apoyo-camara\personal-apoyo-camara.log`.

## Guardas de publicación

1. Descarga manifest y dataset vigentes de R2 y verifica checksum, período, esquema y conteos.
2. Ejecuta sólo la extracción Cámara sobre el snapshot válido. Un fallo deja intacto el release actual.
3. Si el contenido no cambió, termina sin escribir R2 ni iniciar Pages.
4. Si cambió, valida el dataset y publica con el presupuesto account-wide de R2; el puntero del manifest se activa al final. D1 se omite explícitamente.
5. Publica la entrada estática desde el candidato verificado y dispara el workflow de Pages con los controles de refresco y promoción.
6. Un fallo de Pages deja el release R2 como fuente canónica y se registra en el mismo log para reintento.

## Recuperación

- No ejecutes la extracción Cámara desde GitHub-hosted mientras la fuente responda 403 allí.
- Para validar sin extraer ni escribir datos, usa `etl-personal-apoyo.yml` con `verify_release_only=true`.
- El último release activo y sus versiones permanecen en `projections/personal-apoyo-v1/`; no borres versiones ni alteres D1 para recuperar la fuente.
- La tarea usa la sesión interactiva del usuario: Windows debe tener red, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` y `gh auth` disponibles. No crear tokens nuevos para este flujo.
