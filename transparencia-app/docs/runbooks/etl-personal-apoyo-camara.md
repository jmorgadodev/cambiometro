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

## Ejecución comprobada — 10-10-2026

- Se volvió a ejecutar `npm run etl:personal-apoyo-camara:local` después de corregir el parser de la salida JSON de Wrangler.
- La extracción consultó las 155 fichas oficiales de diputadas y diputados: 155 correctas, 0 fallidas, todas correspondientes a septiembre de 2026.
- El candidato coincidió con el release vigente y terminó con `action: unchanged`; se conservaron 4.921 registros (1.094 de Cámara y 3.827 de Senado), checksum `e8f90b61b41b940235b09b5bda2cae431bbc2e949435317d5bbd41d8654c7f83`.
- El artefacto estático de personal de apoyo también coincidió con el release activo `7816d366e792c34d29bcdb750b8f68ed81486064d84469d29ae68f70a261d58d`, checksum `3cbb3e2463d020e04092336d2ea1373934ee2db26bd0fb74b45281f88491c883`; `updatedFiles: 0`. No se escribieron objetos nuevos en R2, no se abrió otro despliegue de Pages y D1 no se consultó ni modificó.
- El despliegue UI independiente que quedó vigente ese día usó el artefacto validado contra el `ReleaseSet`: Pages `d8e70a89-11ac-456f-8ac6-0c4bc1acb5f1` (`https://d8e70a89.cambiometro.pages.dev`), verificado contra `https://cambiometro.impulsacv.cl`. Rollback: `npm run pages:rollback -- d8e70a89-11ac-456f-8ac6-0c4bc1acb5f1`.
- La tarea semanal permanece registrada para el lunes a las 09:30 hora de Santiago. Esta comprobación manual acredita el ETL y su política de no-op cuando no hay cambios; la siguiente ejecución programada debe revisarse en el log local antes de declarar estabilidad periódica.
