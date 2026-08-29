# ETL de gastos operacionales

## Arquitectura

La Cámara de Diputadas y Diputados se consulta desde un equipo local persistente
porque su sitio WebForms puede bloquear las IP efímeras de GitHub Actions. El
runner local conserva el progreso del conector en la carpeta temporal del equipo,
descarga desde R2 los subconjuntos vigentes de Cámara y Senado, fusiona por ID y
publica sólo después de validar el universo completo.

GitHub Actions ya no abre un navegador contra Cámara. Su workflow mensual mantiene
la actualización de Senado, verifica que el subconjunto de Cámara publicado siga
presente y dispara el refresco estático de Pages cuando corresponde.

Bot Management de `cambiometro.impulsacv.cl` no controla las solicitudes salientes
hacia `camara.cl`; desactivarlo no resolvería este bloqueo y no forma parte de esta
solución.

## Primera configuración en Windows

En el equipo que permanecerá encendido:

1. Clonar el repositorio en una carpeta local persistente y ejecutar `npm ci` dentro
   de `transparencia-app`.
2. Instalar Chrome o Edge. El conector usa un navegador headless y trabaja de forma
   secuencial para no provocar un nuevo rate limit.
3. Configurar fuera de Git las variables `CLOUDFLARE_ACCOUNT_ID` y
   `CLOUDFLARE_API_TOKEN`. El token debe tener sólo acceso necesario a R2 para leer
   y escribir el bucket `transparencia-public-data`.
4. Iniciar sesión con GitHub CLI (`gh auth login`) si se desea que el runner
   dispare automáticamente el refresco de Pages.
5. Probar manualmente, sólo cuando corresponda ejecutar una extracción:

   ```powershell
   cd transparencia-app
   npm run etl:expenses:local -- --force --trigger-pages
   ```

   La opción `--force` permite probar fuera del día 2. El runner aborta antes de
   publicar si faltan subconjuntos remotos, hay una extracción parcial, disminuyen
   los registros, falla el checksum o falla `verify-expense-release.mjs`.

## Automatización

Registrar la tarea una sola vez desde PowerShell:

```powershell
cd transparencia-app
powershell -ExecutionPolicy Bypass -File .\scripts\install-etl-expenses-task.ps1
```

La tarea se ejecuta diariamente a las 05:30 y el runner sólo procesa el día 2 en
`America/Santiago`. Ejecutarla diariamente evita depender de la conversión manual
entre horario de verano e invierno. Los logs quedan en:

```text
C:\ProgramData\Cambiometro\gastos-operacionales\logs
```

El PC debe estar encendido. Si está apagado, no se elimina ni reemplaza el último
release válido; el siguiente intento puede ejecutarse con `--force`.

## Flujo de publicación

```text
R2 release vigente → extracción local Cámara → merge por ID → validación
→ publicación estática gastos → verificación remota de checksum
→ workflow Pages refresca out/ → smoke y producción
```

No se suben snapshots ni logs a GitHub. Si el proceso falla, se conserva el
snapshot anterior y Pages no se refresca.
