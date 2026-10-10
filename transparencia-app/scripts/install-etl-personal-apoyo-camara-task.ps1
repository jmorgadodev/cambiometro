param(
  [string]$TaskName = "Cambiometro - ETL Personal de Apoyo Cámara local",
  [string]$At = "09:30"
)

$ErrorActionPreference = "Stop"
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runner = Join-Path $PSScriptRoot "etl-personal-apoyo-camara-runtime.mjs"
$node = (Get-Command node.exe).Source
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
  throw "La tarea '$TaskName' ya existe; no se reemplazó. Revísala antes de modificarla."
}

& $node $runner --prepare-only
if ($LASTEXITCODE -ne 0) { throw "La validación previa del runner falló: $LASTEXITCODE" }

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$runner`"" -WorkingDirectory $appRoot
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Description "Actualiza Personal de Apoyo de Cámara desde la red local cuando hay cambios; conserva el release R2 y no usa D1." | Out-Null
Write-Output "Tarea registrada: $TaskName"
Write-Output "Ejecución semanal lunes $At; si el equipo está apagado, se ejecuta al volver a estar disponible."
